import factory
from organizations.models import OrganizationMember
from users.models import User


class UserFactory(factory.django.DjangoModelFactory):
    email = factory.Faker('email')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    username = factory.LazyAttribute(lambda u: u.email.split('@')[0])
    # Hash via set_password so has_usable_password() is reliable. Raw Faker strings
    # can start with '!' and Django treats those as unusable passwords.
    password = factory.PostGenerationMethodCall('set_password', 'testpassword')

    class Meta:
        model = User

    @factory.post_generation
    def active_organization(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.active_organization = extracted
        self.save(update_fields=['active_organization'])
        OrganizationMember.objects.create(user=self, organization=extracted)
