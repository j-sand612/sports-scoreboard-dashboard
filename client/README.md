# Sports Score Dashboard

A real-time sports score dashboard with a React frontend and Node.js backend. The system fetches live sports data from TheSportsDB API and displays it in a customizable dashboard. It also provides an API endpoint for embedded devices like Raspberry Pi or ESP32 to fetch simplified score data.

## Features

- Search and add favorite sports teams from multiple leagues
- Real-time score updates
- Persistent user preferences via localStorage
- Mobile-responsive design
- Backend caching to minimize API calls
- API endpoint for embedded devices

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **API**: TheSportsDB API (free tier)
- **Future Integration**: ESP32/Raspberry Pi support

## Project Structure

```
sports-score-dashboard/
├── client/                  # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TeamSelector.js
│   │   │   └── ScoreBoard.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
├── server.js                # Express backend
├── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sports-score-dashboard.git
   cd sports-score-dashboard
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create a React app in the client directory:
   ```bash
   npx create-react-app client
   ```

4. Replace the default files in the client/src directory with the files from this project.

5. Install frontend dependencies:
   ```bash
   cd client
   npm install axios recharts
   cd ..
   ```

### Running the Application

1. Start both the backend and frontend in development mode:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run heroku-postbuild
npm start
```

## API Endpoints

### Search Teams
- **URL**: `/api/search`
- **Method**: GET
- **Query Parameters**: 
  - `q` (required): Search term
  - `league` (optional): League ID to filter by

### Fetch Scores
- **URL**: `/api/scores`
- **Method**: POST
- **Body**: 
  ```json
  {
    "teams": [
      {
        "id": "133604",
        "name": "Team Name",
        "league": "League Name"
      }
    ]
  }
  ```

### Device API
- **URL**: `/api/device/scores`
- **Method**: GET
- **Query Parameters**:
  - `teams` (required): Comma-separated list of team IDs

## Embedded Device Integration

The project includes sample code for ESP32 integration. To use:

1. Upload the provided ESP32 code to your device
2. Configure WiFi credentials
3. Update the API URL to point to your deployed backend
4. Connect an SSD1306 OLED display to your ESP32
5. Power on the device

## Future Enhancements

- User accounts with database storage
- Push notifications for game start/end
- Advanced filtering options
- Support for multiple display types on embedded devices
- Customizable display layouts

## License

MIT

## Acknowledgements

- [TheSportsDB](https://www.thesportsdb.com/) for providing the sports data API
- [Create React App](https://create-react-app.dev/)
- [Express](https://expressjs.com/)
- [Adafruit](https://www.adafruit.com/) for their great embedded device libraries