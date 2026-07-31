from simple_repository import crud_factory

from src.models.feature_flags import FeatureFlagCreate, FeatureFlagPatch, FeatureFlagSchema
from src.orm.feature_flags import FeatureFlag


class FeatureFlagsRepository(
    crud_factory(FeatureFlag, FeatureFlagSchema, FeatureFlagCreate, FeatureFlagPatch),
):
    def to_inner(self, data: FeatureFlagCreate | FeatureFlagSchema | FeatureFlagPatch) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: FeatureFlag) -> FeatureFlagSchema:
        return self.domain_model.model_validate(object)


feature_flags_repository = FeatureFlagsRepository()
