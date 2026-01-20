from dto.user_dto import UserDTO


class UserACLService:
    def create_user(self, user_data) -> UserDTO:  # type: ignore
        # Logic to create a user
        raise NotImplementedError("This method should be implemented by subclasses")

    def get_user(self, user_id) -> UserDTO:  # type: ignore
        # Logic to get a user by ID
        raise NotImplementedError("This method should be implemented by subclasses")


user_acl_service = UserACLService()
