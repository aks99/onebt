# crawler-import (step 6)

Validates the crawler's CSV/JSON (schema in TEDx-Event-Database-Crawler-Prompt.md Part C) and the Google Sheet tabs, and loads them through the same diff, dedup and verify pipeline the Curator Console uses. The app never crawls; this tool reads files and a sheet a person maintains.
