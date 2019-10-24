const handleResponse = res => {
  if (res.status !== 200 || res.status !== 201) {
    return res;
  } else {
    return res.json();
  }
};

const wrapperRequest = (url, method, headers, body) => {
  return window
    .fetch(url, {
      method: method,
      headers: headers,
      credentials: "include",
      body: body,
    })
    .then(response => handleResponse(response));
};

const fetcher = url => {
  return wrapperRequest(url, "GET", { Accept: "application/json" });
};

const fetcherAuth = async (url, data) => {
  const response = await window.fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa(data.username + ":" + data.password),
    },
    credentials: "same-origin",
  });
  return handleResponse(response);
};

const poster = (url, body) => {
  return wrapperRequest(url, "POST", { Accept: "application/json", "Content-Type": "application/json" }, body);
};

const patch = (url, body) => {
  return wrapperRequest(
    url,
    "PATCH",
    {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body,
  );
};

const remover = (url, body) => {
  return wrapperRequest(
    url,
    "DELETE",
    {
      "Content-Type": "application/json",
    },
    body,
  );
};

export default { fetcher, fetcherAuth, poster, remover, patch };
