from simple_repository import crud_factory
from simple_repository.exceptions import NotFoundException

from models.donation import Donation, DonationCreate, DonationPatch

from orm.donation import Donation as ORMDonation


class DonationRepository(crud_factory(ORMDonation, Donation, DonationCreate, DonationPatch)):
    def to_inner(self, data: DonationCreate | Donation | DonationPatch) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: ORMDonation) -> Donation:
        return Donation.model_validate(object)


donation_repo = DonationRepository()
