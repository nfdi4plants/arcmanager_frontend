# arcmanager-frontend

The ARCmanager is a online web application with which you can create and manage your ARCs directly on the DataHUB of your choice.
The ARCmanager can be found [here](https://nfdi4plants.de/arcmanager/app/index.html)

The ARCmanager is based around an early version of the Arcitect, therefore it also uses Vue.js and Quasar.
The backend is made with python using Fastapi and can be found [here](https://github.com/nfdi4plants/arcmanager_backend).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### build the application for Production

```sh
npm run build
```

For local development change the line in [AppProperties.ts](./src/AppProperties.ts) to:

```typescript
//address of the backend
//backend: "https://nfdi4plants.de/arcmanager/api/v1/",
backend: "http://localhost:8000/arcmanager/api/v1/",
```
