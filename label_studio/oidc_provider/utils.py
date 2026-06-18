import unicodedata


def generate_username(email):
    username = email.split('@')[0]
    username = unicodedata.normalize('NFKC', username)
    return username[:150]
