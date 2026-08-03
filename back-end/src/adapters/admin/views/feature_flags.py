from sqladmin import ModelView
from sqladmin.filters import AllUniqueStringValuesFilter, BooleanFilter, OperationColumnFilter

from src.orm.feature_flags import FeatureFlag


class FeatureFlagAdmin(ModelView, model=FeatureFlag):
    name = "Feature Flag"
    name_plural = "Feature Flags"
    icon = "fa-solid fa-flag"

    column_list = [
        FeatureFlag.id,
        FeatureFlag.key,
        FeatureFlag.label,
        FeatureFlag.min_tier,
        FeatureFlag.scope,
        FeatureFlag.is_enabled,
        FeatureFlag.created_at,
    ]
    column_searchable_list = [FeatureFlag.key, FeatureFlag.label]
    column_filters = [
        AllUniqueStringValuesFilter(FeatureFlag.scope),
        BooleanFilter(FeatureFlag.is_enabled),
        OperationColumnFilter(FeatureFlag.min_tier),
    ]
    form_excluded_columns = [FeatureFlag.created_at, FeatureFlag.updated_at]
