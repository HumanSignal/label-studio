from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db import connection
from django.db.models import Q


def prepare_search_query(query: str) -> str:
    """Prepare a prefix-matching PostgreSQL full-text search query."""
    word_parts = []
    for word in query.strip().split(' '):
        original_word = word.strip()
        if not original_word:
            continue

        escaped_word = original_word
        for char in ['\\', '&', '|', '!', '(', ')', ':', '*', '"', "'"]:
            escaped_word = escaped_word.replace(char, f'\\{char}')

        word_parts.append(f'{escaped_word}:*')

    return ' | '.join(word_parts)


def search_projects(queryset, query):
    """Search projects by title and description."""
    if not query:
        return queryset

    partial_match_query = prepare_search_query(query)
    if not partial_match_query or connection.vendor != 'postgresql':
        return queryset.filter(title__icontains=query)

    search_query = SearchQuery(partial_match_query, search_type='raw', config='simple')
    search_rank = SearchRank('search_vector', search_query)

    return (
        queryset.filter(Q(search_vector=search_query) | Q(title__icontains=query))
        .annotate(rank=search_rank)
        .order_by('-rank')
    )
