def get_user_repr(user):
    """Turn user object into dict with required properties"""
    if user.is_anonymous:
        return {'key': str(user), 'custom': {'organization': None, 'organization_id': None}}
    user_data = {'email': user.email}
    user_data['key'] = user_data['email']
    if user.active_organization is not None:
        user_data['custom'] = {
            'organization': user.active_organization.created_by.email,
            'organization_id': user.active_organization.id,
        }
    else:
        user_data['custom'] = {'organization': None, 'organization_id': None}
    return user_data


def get_user_repr_from_organization(organization):
    """Turn organization object into its owner dict"""
    if organization is None:
        return {
            'key': 'none',
            'custom': {'organization': None, 'organization_id': None},
        }

    email = organization.created_by.email if organization.created_by else None
    return {
        'key': email,
        'custom': {
            'organization': email,
            'organization_id': organization.id,
        },
    }


def get_user_repr_from_organization_id(organization_id):
    """Build an organization-targeting context without loading its owner.

    Unlike ``get_user_repr_from_organization``, the key is synthetic (``organization:<id>``) and the
    ``organization`` attribute (owner email) is ``None``: LaunchDarkly rules for flags evaluated through
    ``flag_set_for_org_id`` must target the ``organization_id`` attribute, not ``organization``. Each organization
    evaluated this way appears as one new LaunchDarkly context.
    """
    return {
        'key': f'organization:{organization_id}',
        'custom': {
            'organization': None,
            'organization_id': organization_id,
        },
    }
