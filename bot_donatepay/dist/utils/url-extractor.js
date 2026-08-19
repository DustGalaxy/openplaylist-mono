"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractVideoUrl = extractVideoUrl;
/**
 * Извлекает URL медиа/видео из структуры переменных доната DonatePay.
 * Приоритеты:
 * 1. Прямая ссылка из объекта video (vars.video.link)
 * 2. ID YouTube видео из объекта video (vars.video.id)
 * 3. URL, найденный в тексте комментария (vars.comment)
 */
function extractVideoUrl(vars) {
    if (vars.video?.link) {
        return vars.video.link.trim();
    }
    if (vars.video?.id) {
        return `https://www.youtube.com/watch?v=${vars.video.id.trim()}`;
    }
    if (vars.comment) {
        const match = vars.comment.match(/(https?:\/\/[^\s]+)/);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return "";
}
