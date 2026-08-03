import importlib
import json
import pkgutil
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Request
from fastapi.responses import RedirectResponse, Response
from sqladmin import BaseView, expose
from taskiq import ScheduledTask

import src.tasks
from taskiq_broker import redis_sourse, task_broker


def get_available_tasks() -> list[str]:
    """Dynamically import all task modules under src.tasks and return registered task names."""
    try:
        if hasattr(src.tasks, "__path__"):
            for _, name, _ in pkgutil.iter_modules(src.tasks.__path__):
                try:
                    importlib.import_module(f"src.tasks.{name}")
                except Exception:
                    pass
    except Exception:
        pass

    registered = list(task_broker.get_all_tasks().keys())
    return sorted(registered)


class TasksSchedulerAdmin(BaseView):
    """SQLAdmin BaseView for viewing, creating, and deleting Taskiq scheduled tasks stored in Redis."""

    name = "Task Scheduler"
    icon = "fa-solid fa-clock"

    @expose("/tasks", methods=["GET"])
    async def list_tasks(self, request: Request) -> Response:
        """Display scheduled tasks and creation form."""
        available_tasks = get_available_tasks()

        status_msg = request.query_params.get("status")
        message = request.query_params.get("message")

        schedules: list[ScheduledTask] = []
        fetch_error: str | None = None

        try:
            schedules = await redis_sourse.get_schedules()
        except Exception as ex:
            fetch_error = f"Failed to fetch schedules from Redis: {ex}"

        formatted_tasks: list[dict[str, Any]] = []
        for sched in schedules:
            if sched.cron:
                sched_type = "CRON"
                sched_expr = sched.cron
            elif sched.time:
                sched_type = "One-Time (Delayed)"
                sched_expr = sched.time.isoformat() if isinstance(sched.time, datetime) else str(sched.time)
            elif sched.interval:
                sched_type = "Interval"
                sched_expr = str(sched.interval)
            else:
                sched_type = "Custom / Undefined"
                sched_expr = "-"

            formatted_tasks.append(
                {
                    "schedule_id": sched.schedule_id,
                    "task_name": sched.task_name,
                    "schedule_type": sched_type,
                    "schedule_expr": sched_expr,
                    "args_json": json.dumps(sched.args, ensure_ascii=False) if sched.args else "[]",
                    "kwargs_json": json.dumps(sched.kwargs, ensure_ascii=False) if sched.kwargs else "{}",
                    "labels": json.dumps(sched.labels, ensure_ascii=False) if sched.labels else "{}",
                    "cron": sched.cron,
                    "time": sched.time,
                }
            )

        context: dict[str, Any] = {
            "request": request,
            "tasks": formatted_tasks,
            "available_tasks": available_tasks,
            "status": status_msg,
            "message": message,
            "fetch_error": fetch_error,
        }

        return await self.templates.TemplateResponse(request, "tasks_scheduler.html", context)

    @expose("/tasks/add", methods=["POST"])
    @expose("/tasks/create_task", methods=["POST"])
    @expose("/tasks/schedule/create", methods=["POST"])
    async def create_task(self, request: Request) -> Response:
        """Handle POST request to create a new scheduled task in Taskiq Redis Schedule Source."""
        form_data = await request.form()

        task_name = str(form_data.get("task_name", "")).strip()
        custom_task_name = str(form_data.get("custom_task_name", "")).strip()

        if task_name == "__custom__" or not task_name:
            task_name = custom_task_name

        if not task_name:
            return RedirectResponse(
                url="/admin/tasks?status=error&message=Task+name+is+required.",
                status_code=303,
            )

        execution_mode = str(form_data.get("execution_mode", "cron")).strip()
        cron_expression = str(form_data.get("cron_expression", "")).strip()
        execution_time_str = str(form_data.get("execution_time", "")).strip()
        delay_seconds_str = str(form_data.get("delay_seconds", "")).strip()

        args_json_str = str(form_data.get("args_json", "[]")).strip() or "[]"
        kwargs_json_str = str(form_data.get("kwargs_json", "{}")).strip() or "{}"

        # Parse JSON positional and keyword arguments
        try:
            parsed_args = json.loads(args_json_str)
            if not isinstance(parsed_args, list):
                return RedirectResponse(
                    url="/admin/tasks?status=error&message=Positional+arguments+must+be+a+JSON+array+%28list%29.",
                    status_code=303,
                )
        except json.JSONDecodeError as ex:
            return RedirectResponse(
                url=f"/admin/tasks?status=error&message=Invalid+JSON+in+args%3A+{ex.msg}",
                status_code=303,
            )

        try:
            parsed_kwargs = json.loads(kwargs_json_str)
            if not isinstance(parsed_kwargs, dict):
                return RedirectResponse(
                    url="/admin/tasks?status=error&message=Keyword+arguments+must+be+a+JSON+object+%28dict%29.",
                    status_code=303,
                )
        except json.JSONDecodeError as ex:
            return RedirectResponse(
                url=f"/admin/tasks?status=error&message=Invalid+JSON+in+kwargs%3A+{ex.msg}",
                status_code=303,
            )

        cron_val: str | None = None
        time_val: datetime | None = None

        if execution_mode == "cron":
            if not cron_expression:
                return RedirectResponse(
                    url="/admin/tasks?status=error&message=CRON+expression+is+required+for+CRON+mode.",
                    status_code=303,
                )
            cron_val = cron_expression
        elif execution_mode == "one_time":
            if execution_time_str:
                try:
                    time_val = datetime.fromisoformat(execution_time_str)
                except ValueError:
                    return RedirectResponse(
                        url="/admin/tasks?status=error&message=Invalid+datetime+format.+Expected+ISO+format.",
                        status_code=303,
                    )
            elif delay_seconds_str:
                try:
                    delay_sec = int(delay_seconds_str)
                    time_val = datetime.now(timezone.utc) + timedelta(seconds=delay_sec)
                except ValueError:
                    return RedirectResponse(
                        url="/admin/tasks?status=error&message=Delay+seconds+must+be+an+integer.",
                        status_code=303,
                    )
            else:
                return RedirectResponse(
                    url="/admin/tasks?status=error&message=Provide+either+Execution+Time+or+Delay+Seconds+for+One-Time+tasks.",
                    status_code=303,
                )
        else:
            return RedirectResponse(
                url="/admin/tasks?status=error&message=Invalid+execution+mode+selected.",
                status_code=303,
            )

        schedule_id = f"sch_{uuid.uuid4().hex[:12]}"

        scheduled_task = ScheduledTask(
            schedule_id=schedule_id,
            task_name=task_name,
            labels={},
            args=parsed_args,
            kwargs=parsed_kwargs,
            cron=cron_val,
            time=time_val,
        )

        try:
            if hasattr(redis_sourse, "post_schedule"):
                await redis_sourse.post_schedule(scheduled_task)
            elif hasattr(redis_sourse, "add_schedule"):
                await redis_sourse.add_schedule(scheduled_task)
            else:
                await redis_sourse.add_schedule(scheduled_task)
        except Exception as ex:
            return RedirectResponse(
                url=f"/admin/tasks?status=error&message=Failed+to+save+schedule+to+Redis%3A+{ex}",
                status_code=303,
            )

        return RedirectResponse(
            url=f"/admin/tasks?status=success&message=Scheduled+task+%27{schedule_id}%27+created+successfully.",
            status_code=303,
        )

    @expose("/tasks/delete_schedule/{schedule_id}", methods=["POST"])
    @expose("/tasks/delete_task/{schedule_id}", methods=["POST"])
    async def delete_task(self, request: Request, schedule_id: str = "") -> Response:
        """Handle POST request to delete a scheduled task from Taskiq Redis Schedule Source."""
        target_schedule_id = schedule_id or request.path_params.get("schedule_id", "")
        if not target_schedule_id:
            return RedirectResponse(
                url="/admin/tasks?status=error&message=Schedule+ID+is+missing.",
                status_code=303,
            )

        try:
            await redis_sourse.delete_schedule(target_schedule_id)
        except Exception as ex:
            return RedirectResponse(
                url=f"/admin/tasks?status=error&message=Failed+to+delete+schedule+%27{target_schedule_id}%27%3A+{ex}",
                status_code=303,
            )

        return RedirectResponse(
            url=f"/admin/tasks?status=success&message=Schedule+%27{target_schedule_id}%27+deleted+successfully.",
            status_code=303,
        )
