# MyKep

The MyKep project is a modern progressive web application designed for uninterrupted access to an educational institution's class schedule. The main advantage of this solution lies in its ability to function fully in the complete absence of an internet connection or during temporary unavailability of the main server, thanks to its PWA architecture.

The technical foundation of the project is built on the high-performance FastAPI framework, which handles routing and serving static files. The collection of up-to-date schedule information is carried out using an integrated parser based on Cloudscraper, which effectively retrieves the necessary data from the official resource. To minimize the load on the target site and ensure backend autonomy, the APScheduler is used, which automates the background updating process of the local JSON schedule file.

The frontend part is implemented using pure web technologies. The key element of the client functionality is the Service Worker, configured for a hybrid caching strategy. Static interface resources are stored locally during the app installation, while schedule data is intercepted and updated based on a network-first principle with automatic fallback backup saving, ensuring instant information display even in airplane mode.
