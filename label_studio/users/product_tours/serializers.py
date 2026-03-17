import logging
import pathlib
from functools import cached_property

import yaml
from core.utils.db import fast_first
from rest_framework import serializers

from .models import ProductTourInteractionData, ProductTourState, UserProductTour

logger = logging.getLogger(__name__)

PRODUCT_TOURS_CONFIGS_DIR = pathlib.Path(__file__).parent / 'configs'


class UserProductTourSerializer(serializers.ModelSerializer):
    # steps is a list of steps in the tour loaded from the yaml file
    steps = serializers.SerializerMethodField(read_only=True)
    # awaiting is a boolean that indicates if the tour is awaiting other tours in the list of "dependencies"
    awaiting = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserProductTour
        fields = '__all__'

    @cached_property
    def available_tours(self):
        return {pathlib.Path(f).stem for f in PRODUCT_TOURS_CONFIGS_DIR.iterdir()}

    def validate_name(self, value):
        if value not in self.available_tours:
            raise serializers.ValidationError(
                f'Product tour {value} not found. Available tours: {self.available_tours}'
            )

        return value

    @cached_property
    def load_tour_config(self):
        # TODO: get product tour from yaml file. Later we move it to remote storage, e.g. S3
        filepath = PRODUCT_TOURS_CONFIGS_DIR / f'{self.context["name"]}.yml'
        with open(filepath, 'r') as f:
            return yaml.safe_load(f)

    def get_awaiting(self, obj):
        config = self.load_tour_config
        dependencies = config.get('dependencies', [])
        for dependency in dependencies:
            tour = fast_first(UserProductTour.objects.filter(user=self.context['request'].user, name=dependency))
            if not tour or tour.state != ProductTourState.COMPLETED:
                logger.info(f'Tour {dependency} is not completed: skipping tour {self.context["name"]}')
                return True
        return False

    def get_steps(self, obj):
        config = self.load_tour_config
        return config.get('steps', [])

    def validate_interaction_data(self, value):
        try:
            # Validate interaction data using pydantic model
            ProductTourInteractionData(**value)
            return value
        except Exception:
            raise serializers.ValidationError('Invalid product tour interaction data format.')
