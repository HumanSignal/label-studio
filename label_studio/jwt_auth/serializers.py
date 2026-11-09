from jwt_auth.models import JWTSettings, LSAPIToken, TruncatedLSAPIToken
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenBlacklistSerializer
from rest_framework_simplejwt.settings import api_settings as simple_jwt_settings
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken


# Recommended implementation from JWT to support auto API documentation
class TokenRefreshResponseSerializer(serializers.Serializer):
    access = serializers.CharField()


class JWTSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = JWTSettings
        fields = ('api_tokens_enabled', 'legacy_api_tokens_enabled')


class LSAPITokenCreateSerializer(serializers.Serializer):
    token = serializers.SerializerMethodField()

    def get_token(self, obj) -> str:
        return obj.get_full_jwt()

    class Meta:
        model = LSAPIToken
        fields = ['token']


class LSAPITokenListSerializer(LSAPITokenCreateSerializer):
    def get_token(self, obj) -> str:
        # only return header/payload portion of token, using LSTokenBackend
        return str(obj)


class LSAPITokenBlacklistSerializer(TokenBlacklistSerializer):
    token_class = TruncatedLSAPIToken

    def validate(self, attrs):
        # The UI sends truncated tokens without a signature, so the stored token of the caller is the only proof
        token = self.token_class(attrs['refresh'])
        jti = token.get(simple_jwt_settings.JTI_CLAIM)
        user = self.context['request'].user
        if not jti or not OutstandingToken.objects.filter(jti=jti, user_id=user.id).exists():
            raise TokenError('Token is invalid or does not belong to the current user')
        token.blacklist()
        return {}


class LSAPITokenRotateSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, data):
        refresh = data.get('refresh')
        try:
            token = RefreshToken(refresh)
        except Exception:
            raise serializers.ValidationError('Invalid refresh token')
        data['refresh'] = token
        return data


class TokenRotateResponseSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class TokenDetailErrorSerializer(serializers.Serializer):
    detail = serializers.CharField()
