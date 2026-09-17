# CIP investor data room — full leadership preview

Public preview: https://danicollante.github.io/cip-investor-data-room-review/

This is the complete static design preview. Entooma Sidai is populated with the current working data, model figures, citations and 151-entry document index. The other 16 projects retain their real pipeline names but are unavailable until populated.

The Entooma Overview includes five source-derived GIS layers on an interactive map. The boundary on file is 652,022 ha and does not yet match CIP's confirmed 500,000 ha. Map tiles load from OpenStreetMap and require an internet connection; Leaflet is bundled locally.

Accounts, permissions, NDA, invitations, requests and activity are simulated in the browser. No original documents are delivered. This static site's data files are publicly readable if deployed.

Open `index.html` through an HTTP server, or use the GitHub Pages root URL after deployment. The `docs/_sandbox-codex` path is retained so existing relative asset links work.

Rebuild after any source change: `python3 docs/_sandbox-codex/build_full_review.py`. Review the file list and commit each client-facing update in this separate repository.
