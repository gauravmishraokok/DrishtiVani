# Steps to Run

1. Install Docker Desktop.

2. Make an account on Vapi, get the env variables after configuring the voice agent according to `.env.example`.

3. Perform a docker pull for Qdrant to run it locally:
```

docker pull qdrant/qdrant

```

4. Run the service on the pulled image  
_NOTE: DO THIS IN A LOCAL FOLDER, NOT IN ROOT DIRECTORY._
```

docker run -p 6333:6333 -p 6334:6334 -v "$(pwd)/qdrant_storage:/qdrant/storage:z" qdrant/qdrant

```

5. Move to frontend and backend folders, install the dependencies, and run the app  
_NOTE: SAME COMMANDS FOR BOTH FOLDERS._
```

npm install
npm run dev

````

---

## Services & Endpoints

| Component               | URL                      |
|------------------------|--------------------------|
| Backend                | localhost:5001           |
| Frontend               | localhost:5173           |
| Qdrant Local Dashboard | localhost:6333/dashboard |


## Data Storage & Usage

| Purpose                                | Technology |
|----------------------------------------|------------|
| Preprocessed Data for Teaching and RAG | Qdrant     |
| User Data and Progress Tracking        | MongoDB    |
