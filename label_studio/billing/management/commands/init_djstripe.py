"""Django management command to initialize dj-stripe API keys in the database."""
import logging

import djstripe
from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Initialize dj-stripe API keys by syncing them from Django settings to the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing API keys even if they already exist',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        success_count = 0
        error_count = 0

        # Process test key
        test_key = getattr(settings, 'STRIPE_TEST_SECRET_KEY', '')
        if test_key:
            try:
                api_key, created = djstripe.models.APIKey.objects.get_or_create(
                    livemode=False,
                    defaults={'secret': test_key}
                )
                if not created and force:
                    api_key.secret = test_key
                    api_key.save(update_fields=['secret'])
                    self.stdout.write(
                        self.style.SUCCESS('Updated test API key in database')
                    )
                elif created:
                    self.stdout.write(
                        self.style.SUCCESS('Created test API key in database')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING('Test API key already exists in database (use --force to update)')
                    )
                success_count += 1
            except Exception as e:
                logger.exception('Failed to sync test API key: %s', e)
                self.stdout.write(
                    self.style.ERROR(f'Failed to sync test API key: {str(e)}')
                )
                error_count += 1
        else:
            self.stdout.write(
                self.style.WARNING('STRIPE_TEST_SECRET_KEY is not set in settings, skipping test key')
            )

        # Process live key
        live_key = getattr(settings, 'STRIPE_LIVE_SECRET_KEY', '')
        if live_key:
            try:
                api_key, created = djstripe.models.APIKey.objects.get_or_create(
                    livemode=True,
                    defaults={'secret': live_key}
                )
                if not created and force:
                    api_key.secret = live_key
                    api_key.save(update_fields=['secret'])
                    self.stdout.write(
                        self.style.SUCCESS('Updated live API key in database')
                    )
                elif created:
                    self.stdout.write(
                        self.style.SUCCESS('Created live API key in database')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING('Live API key already exists in database (use --force to update)')
                    )
                success_count += 1
            except Exception as e:
                logger.exception('Failed to sync live API key: %s', e)
                self.stdout.write(
                    self.style.ERROR(f'Failed to sync live API key: {str(e)}')
                )
                error_count += 1
        else:
            self.stdout.write(
                self.style.WARNING('STRIPE_LIVE_SECRET_KEY is not set in settings, skipping live key')
            )

        # Summary
        if error_count > 0:
            self.stdout.write(
                self.style.ERROR(f'\nCompleted with {error_count} error(s)')
            )
        elif success_count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'\nSuccessfully initialized {success_count} API key(s)')
            )
        else:
            self.stdout.write(
                self.style.WARNING('\nNo API keys were initialized (check your settings)')
            )

