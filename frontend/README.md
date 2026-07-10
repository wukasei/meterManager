## Project Setup

### Clone the repository

```bash
git clone https://github.com/MeterManager/meter-manager-ui.git
cd meter-manager-ui
```

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env` file in the project root. Refer to `.env.example` for the structure. All variables must use the `VITE_` prefix.

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_AUTH0_DOMAIN=your_auth0_domain
VITE_AUTH0_CLIENT_ID=your_auth0_client_id
VITE_AUTH0_AUDIENCE=your_api_audience
VITE_PORT=5173
```

> ⚠️ Do not store sensitive values in the repository. Use secure configuration management in production.

## Running the Application

### Development (with HMR)

```bash
npm run dev
```

Access at: `http://localhost:5173`

### Production build

```bash
npm run build
npm run preview
```

Static files are in the `dist/` directory.

## NPM Scripts

* Preview production build: `npm run preview`
* Lint code: `npm run lint`
* Format code: `npm run format`
