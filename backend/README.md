# Meter Manager API

REST API for managing meters and related data. The project is implemented using Node.js with PostgreSQL and Sequelize, supports database migrations, Swagger API documentation, and containerized deployment via Docker.

---

## Environment Requirements

To run and use the application correctly, the following software is required:

* **Node.js** (version 18.x or newer)
* **npm**
* **PostgreSQL** or a cloud database (e.g. Neon)
* **Docker** and **Docker Compose** (for containerized deployment)
* Any modern web browser for working with **Swagger UI**

---

## Project Setup and Launch Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/MeterManager/meter-manager-api.git
cd meter-manager-api
```

### 2. Install Dependencies

After cloning the repository, install all project dependencies:

```bash
npm install
```

### 3. Environment Variables Configuration

To run the application correctly, create a **.env** file in the root directory of the project.

An example of the environment variables structure is provided in the **.env.example** file.

#### Main Environment Variables:

```env
DB_USER=neondb_owner
DB_PASSWORD=your_password
DB_NAME=neondb
DB_HOST=your_db_host
DB_PORT=5432
DB_SSL=true

CORS_ORIGINS=http://localhost:5173,http://localhost:5000

AUTH0_DOMAIN=your_auth0_domain
AUTH0_AUDIENCE=your_api_audience

PORT=5000
```

> In a production environment, environment variable values are not stored in the repository and are provided through secure configuration mechanisms.

---

### 4. Running the Server

The application can be started in standard or development mode.

#### Standard start:

```bash
node server.js
```

#### Development mode with automatic restart (nodemon):

```bash
npx nodemon server.js
```

After a successful start, the server will be available at:

* **API:** [http://localhost:5000](http://localhost:5000)
* **Swagger API documentation:** [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

---

### 5. Running with Docker

The project supports containerized deployment using Docker and Docker Compose.

Build Docker images:

```bash
docker-compose build
```

Run containers in detached mode:

```bash
docker-compose up -d
```

After that, the API will be available on the port specified in the environment variables.

---

## Database Management (Sequelize CLI)

The project uses database migrations to manage the database schema.

### Run migrations:

```bash
npx sequelize-cli db:migrate
```

### Undo the last migration:

```bash
npx sequelize-cli db:migrate:undo
```

---

## npm Scripts

The project includes helper npm scripts for code quality control:

* **Run ESLint checks:**

```bash
npm run lint
```

* **Automatically fix lint issues:**

```bash
npm run lint:fix
```

* **Format code:**

```bash
npm run format
```