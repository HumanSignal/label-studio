def serialize_request(request):
    try:
        data = {key: value for key, value in request.META.items() if isinstance(value, (str, bool, int, float))}
        data[request.method] = getattr(request, request.method)
        return data
    except:
        return {}
