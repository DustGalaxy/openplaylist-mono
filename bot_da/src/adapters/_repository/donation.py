from simple_repository import crud_factory
from simple_repository.exceptions import NotFoundException

from models.donation import Donation, DonationCreate, DonationPatch

from orm.donation import Donation as ORMDonation


class DonationRepository(crud_factory(ORMDonation, Donation, DonationCreate, DonationPatch)): ...


donation_repo = DonationRepository()
