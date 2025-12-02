## Overview

Below are examples showing how to retrieve (list) all CellMorphology entities using the Open Brain Platform Python SDK (entitysdk). I include:

- A minimal example that fetches a limited set (safe default).
- A full \u201cget all\u201d pattern that pages through results until all items are retrieved.
- Notes about pagination and total_items (required by EntityCore rules).

All examples assume you have an authenticated `client` instance from the entitysdk (see your project/docs for authentication). Replace any placeholder values (API keys, endpoints) per your environment.

---

## 1) Minimal / quick preview (limit results)

This fetches a limited number of morphologies (e.g., 10) \u2014 useful for quick checks.

```python
# Example: quick fetch (limit 10)
from entitysdk import Client
from entitysdk.entities import CellMorphology

# instantiate client (fill in auth details per your setup)
client = Client(api_key=\YOUR_API_KEY\")  # adapt to your auth method

# search for CellMorphology with a limit (safe preview)
morphs = client.search_entity(entity_type=CellMorphology, limit=10).all()

print(f\Retrieved {len(morphs)} morphologies (preview)\")
for m in morphs:
    print(m.id, m.name)
```

---

## 2) Recommended: Retrieve ALL morphologies with pagination (robust)

The EntityCore \u201cGET ALL\u201d may paginate. This pattern requests pages until all items are retrieved. It also prints the reported total_items so you can decide whether to continue if needed.

```python
from entitysdk import Client
from entitysdk.entities import CellMorphology

client = Client(api_key=\YOUR_API_KEY\")

# page_size should be <= service max (commonly 10); adapt if docs show different max
page_size = 10
page = 1
all_morphs = []

while True:
    result = client.search_entity(
        entity_type=CellMorphology,
        limit=page_size,
        offset=(page - 1) * page_size  # note: some clients use page/offset; adjust if client API differs
    ).page(page)  # if client provides a page method; otherwise use offset/limit pattern

    # If your client returns a wrapper with items and total_items:
    items = result.items if hasattr(result, \items\") else result  # adapt to the client response structure
    total_items = getattr(result,       otal_items\", None)

    # Collect items
    all_morphs.extend(items)

    # Display progress
    if total_items is not None:
        print(f\Fetched page {page}. collected {len(all_morphs)} of {total_items}\")

    # Stop when fewer items returned than page_size OR we've reached total_items
    if len(items) < page_size:
        break
    if total_items is not None and len(all_morphs) >= total_items:
        break

    page += 1

print(f\Total morphologies retrieved: {len(all_morphs)}\")
```

Notes:
- The entitysdk has multiple helpers; if it exposes a `.all()` or `.iterate()` convenience that automatically pages, prefer that. Example from docs: `client.search_entity(entity_type=CellMorphology).all()`.
- Always check the client response structure for fields like `items`, `total_items`, `limit`, `offset`, or built-in iterators.

---

## 3) Using the entitysdk convenience method shown in examples (single call)

The entitysdk examples show a convenient pattern using search_entity(...).all() to fetch results. If the SDK supports retrieving all with `.all()`, use that:

```python
from entitysdk import Client
from entitysdk.entities import CellMorphology

client = Client(api_key=\YOUR_API_KEY\")

# If the client supports .all() to fetch everything (with internal paging)
morphs = client.search_entity(entity_type=CellMorphology).all()

print(f\Total morphologies returned: {len(morphs)}\")
for m in morphs[:10]:  # show first 10
    print(m.id, m.name)
```

---

## 4) Filtering examples (by mtype or species)

You can pass query filters to narrow results (examples from docs):

- Find morphologies for a specific MType label:

```python
morphs_sr_pc = client.search_entity(
    entity_type=CellMorphology,
    query={\mtype__pref_label\": \SR_PC\"}
).all()
```

- Limit by species (scientific name):

```python
morphs_mouse = client.search_entity(
    entity_type=CellMorphology,
    query={\subject__species__name\": \Mus musculus\"}
).all()
```

---

## Important Platform / EntityCore rules (summary)

- When calling GET ALL endpoints, mention and check `total_items`. Ask before using extra pages if you need to avoid large downloads.
- The EntityCore examples show `client.search_entity(...).all()` as a convenient approach; it may already page for you.
- The SDK examples in the repo demonstrate additional workflows: uploading assets, registering morphologies, adding MType classifications \u2014 see the entitysdk examples for full patterns.

---

If you\u2019d like:
- I can produce a ready-to-run script tailored to your auth method (API key / OAuth) \u2014 tell me which auth you use.
- Or I can show an example using explicit entitycore API parameters (page, page_size) adapted to the exact client methods you have \u2014 tell me which entitysdk version or client functions you see.
