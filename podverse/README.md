# PodVerse - AI-Powered Podcast Platform

PodVerse is an innovative platform that helps users create, personalize, and summarize podcasts using AI. The platform integrates features like audience engagement, personalized profiles, and AI-driven summaries with real-time audio processing capabilities.

## 🚀 Features

- **AI Podcast Host**: Real-time AI agent that conducts podcast interviews
- **Knowledge Base Integration**: Upload documents and get personalized questions
- **Audio Recording**: Automatic recording and transcription
- **Voice Cloning**: Custom voice generation for podcast hosts
- **Real-time Processing**: Live audio processing with LiveKit
- **Supabase Integration**: Cloud storage and database management

## 🏗️ Architecture

### Backend Services
- **FastAPI Server**: Main API server (Port 8000)
- **LiveKit Server**: Real-time audio/video communication (Port 7880)
- **LiveKit Egress**: Audio recording service (Port 8081)
- **Redis**: Message queue for LiveKit (Port 6379)

### Frontend
- **React + Vite**: Modern web interface
- **Tailwind CSS**: Styling framework

## 📋 Prerequisites

- **Docker & Docker Compose**: For running services
- **Python 3.11+**: For backend development
- **Node.js 18+**: For frontend development
- **Git**: For version control

## 🐳 Docker Services Setup

### 1. Start Docker Services

```bash
# Start all services (Redis, LiveKit Server, LiveKit Egress)
docker-compose up -d

# Check if all services are running
docker-compose ps
```

### 2. Verify Services

```bash
# Check LiveKit server logs
docker-compose logs livekit

# Check Egress service logs
docker-compose logs egress

# Check Redis logs
docker-compose logs redis
```

### 3. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## 🔧 Environment Setup

### 1. Backend Environment

Create a `.env` file in the project root:

```env
# LiveKit Configuration
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_EGRESS_URL=http://localhost:8081

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_S3_URL=https://your-project.supabase.co/storage/v1/s3
SUPABASE_ACCESS_KEY_ID=your-access-key
SUPABASE_SECRET_ACCESS_KEY=your-secret-key

# AI Services
GOOGLE_API_KEY=your-google-api-key
TOGETHER_API_KEY=your-together-api-key
DEEPGRAM_API_KEY=your-deepgram-api-key

# Hugging Face
HF_TOKEN=your-hf-token
TTS_URL=https://your-tts-service.hf.space/
LLM_URL=https://your-llm-service.hf.space/
```

### 2. Frontend Environment

Create a `.env` file in the project root for frontend:

```env
# Backend URL
VITE_BACKEND_BASEURL=http://localhost:8000

# Supabase (Frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# LiveKit (Frontend)
VITE_LIVEKIT_URL=ws://localhost:7880
VITE_LIVEKIT_API_KEY=devkey
VITE_LIVEKIT_API_SECRET=secret

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-name
```

## 🚀 Running the Application

### 1. Start Docker Services

```bash
# Start all Docker services
docker-compose up -d

# Verify services are running
docker-compose ps
```

Expected output:
```
NAME             IMAGE                           STATUS
livekit-redis    redis:6-alpine                  Up
livekit-server   livekit/livekit-server:latest   Up
livekit-egress   livekit/egress:latest           Up
```

### 2. Install Backend Dependencies

```bash
# Navigate to modules directory
cd modules

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Start Backend Server

```bash
# Start FastAPI server
python main.py

# Or use uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Start AI Agent

```bash
# Navigate to AI module
cd modules/module_ai

# Set environment variables
export LIVEKIT_URL="ws://localhost:7880"
export LIVEKIT_API_KEY="devkey"
export LIVEKIT_API_SECRET="secret"

# Start the AI agent
python agent.py dev
```

### 5. Install Frontend Dependencies

```bash
# Install Node.js dependencies
npm install
```

### 6. Start Frontend Development Server

```bash
# Start Vite development server
npm run dev
```

### 7. Start Remotion Render Server (For Video Editor)

The video editor requires a separate Remotion render server to generate final MP4 videos from the timeline.

```bash
# In a separate terminal, start the Remotion render server
npm run render-server
```

**Important Notes:**
- The render server runs on **port 4000** by default
- It must be running alongside the frontend dev server for video rendering to work
- The first time you run it, Chrome Headless Shell (~85MB) will be downloaded automatically
- Rendered videos are saved in `public/rendered-videos/` directory
- Render state files are stored in `tmp/render-state/` directory

**What the Render Server Does:**
- Receives render requests from the video editor
- Bundles React components into a video composition
- Renders frames using Chrome Headless Shell
- Encodes frames into MP4 format
- Provides progress updates during rendering
- Serves completed videos for download

**Running Both Servers Together:**

You can run both servers in separate terminals:

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
npm run render-server
```

Or use a process manager like `concurrently` to run both together (optional):
```bash
npm install -D concurrently
# Then add to package.json scripts:
# "dev:all": "concurrently \"npm run dev\" \"npm run render-server\""
```

## 🎯 Usage Guide

### 1. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Remotion Render Server**: http://localhost:4000
- **LiveKit Server**: ws://localhost:7880
- **Egress Service**: http://localhost:8081

### 2. Create a Podcast Session

1. **Upload Documents**: Upload your research materials or documents
2. **Select Knowledge Base**: Choose which documents to use for the session
3. **Start Recording**: Begin the podcast session
4. **AI Host**: The AI agent will ask questions based on your documents
5. **Automatic Recording**: Audio is automatically recorded and stored in Supabase

### 3. AI Agent Features

- **Personalized Questions**: Based on your uploaded documents
- **Real-time Conversation**: Natural, engaging podcast host
- **Knowledge Integration**: Uses your research to ask relevant questions
- **Audio Recording**: Automatically records the entire session

## 🔧 Development

### Project Structure

```
podverse/
├── docker-compose.yaml          # Docker services configuration
├── modules/                     # Backend modules
│   ├── main.py                 # FastAPI main application
│   ├── module_ai/              # AI agent module
│   │   ├── agent.py            # LiveKit AI agent
│   │   └── prompts.py          # AI prompts
│   ├── module_knowledgeBase/   # Knowledge base management
│   ├── module_audios/          # Audio processing
│   └── requirements.txt        # Python dependencies
├── server/                     # Node.js servers
│   └── remotion/               # Remotion render server
│       └── index.ts            # Express server for video rendering
├── src/                        # Frontend React application
│   └── features/
│       └── video-editor-v7/    # Video editor with Remotion
│           └── editor/
│               ├── remotion/   # Remotion composition files
│               └── ssr-helpers/# Render server helpers
├── public/                     # Static assets
│   └── rendered-videos/        # Generated video files
├── tmp/                        # Temporary files
│   └── render-state/           # Render progress tracking
└── README.md                   # This file
```

### Key Components

#### Docker Services
- **Redis**: Message queue for LiveKit communication
- **LiveKit Server**: Real-time audio/video signaling server
- **LiveKit Egress**: Audio recording and processing service

#### Backend Modules
- **AI Agent**: Real-time podcast host using Google Gemini
- **Knowledge Base**: Document processing and RAG (Retrieval Augmented Generation)
- **Audio Processing**: Voice cloning and audio manipulation
- **LiveKit Integration**: Token generation and egress management

#### Frontend
- **React Components**: Modern UI for podcast creation
- **LiveKit Integration**: Real-time audio communication
- **Supabase Integration**: User authentication and data management
- **Video Editor**: Timeline-based video editing with Remotion

#### Video Rendering
- **Remotion Render Server**: Express server for video generation
- **Chrome Headless Shell**: Browser-based frame rendering
- **MP4 Encoding**: Frame-by-frame video composition
- **Progress Tracking**: Real-time render status updates

## 🐛 Troubleshooting

### Common Issues

#### 1. Docker Services Not Starting

```bash
# Check Docker status
docker-compose ps

# Restart services
docker-compose restart

# Check logs
docker-compose logs livekit
```

#### 2. Agent Connection Issues

```bash
# Verify LiveKit server is accessible
curl -I http://localhost:7880

# Check agent logs
# Look for "registered worker" in agent output
```

#### 3. RAG Query Timeouts

```bash
# Check backend logs for RAG processing
# Ensure Together API key is set correctly
# Verify knowledge base has documents
```

#### 4. Audio Recording Issues

```bash
# Check egress service logs
docker-compose logs egress

# Verify Supabase S3 configuration
# Check file permissions in egress_temp directory
```

#### 5. Video Render Server Issues

**Render server not starting:**
```bash
# Make sure tsx is installed
npm install -D tsx

# Check if port 4000 is already in use
netstat -an | findstr :4000

# Verify the server file exists
ls server/remotion/index.ts
```

**Render requests failing (404/500 errors):**
```bash
# Ensure render server is running
# Check server terminal for error messages

# Verify Vite proxy configuration in vite.config.js
# Should proxy /api/latest/ssr/* to http://localhost:4000

# Check browser console for detailed error messages
```

**Module resolution errors:**
```bash
# If you see "Can't resolve '@/components/ui/...'" errors:
# The webpack alias should be configured in custom-renderer.ts
# Verify the alias points to the correct src/ directory
```

**Chrome Headless Shell download issues:**
```bash
# First render will download Chrome (~85MB)
# If download fails, check internet connection
# Chrome is cached after first download
```

### Port Conflicts

If you encounter port conflicts:

```bash
# Check what's using the ports
netstat -an | findstr :7880
netstat -an | findstr :8000
netstat -an | findstr :4000
netstat -an | findstr :6379
netstat -an | findstr :5173

# Stop conflicting services or change ports in:
# - docker-compose.yaml (for Docker services)
# - server/remotion/index.ts (for render server, set REMOTION_SERVER_PORT env var)
# - vite.config.js (for frontend dev server)
```

## 📝 API Endpoints

### LiveKit Integration
- `POST /livekit/get-token` - Generate LiveKit access token
- `POST /livekit/start-audio-egress` - Start audio recording
- `POST /livekit/stop-audio-egress` - Stop audio recording

### Knowledge Base
- `POST /internal/respond` - RAG query for AI agent
- `POST /upload/` - Upload documents
- `GET /list-knowledge-bases/` - List user's knowledge bases

### Audio Processing
- `POST /voice-clone/` - Create voice clone
- `POST /audio-edit/` - Edit audio files

### Video Rendering (Remotion Server)
- `POST /api/latest/ssr/render` - Start video rendering job
- `POST /api/latest/ssr/progress` - Check rendering progress
- `GET /api/latest/ssr/download/:id` - Download rendered video
- `GET /health` - Check render server health

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the logs for error messages

---

**Happy Podcasting! 🎙️**