"""
Main Agent Entrypoint - Dynamic agent selection between Host and Guest
This replaces the old agent.py as the main entry point
"""
from dotenv import load_dotenv
import asyncio
import traceback
import json
from livekit import agents
from livekit.agents import AgentSession, RoomInputOptions
from livekit.plugins import noise_cancellation

# Import both agent types
from agents.agent_host import HostAgent, entrypoint_host
from agents.agent_guest import GuestAgent, entrypoint_guest

load_dotenv()

# ---------- Dynamic Agent Selector ----------
async def entrypoint(ctx: agents.JobContext):
    """
    Main entrypoint that dynamically selects between Host and Guest agents
    based on the agent type specified in the job context or metadata
    """
    print("🚀 Starting Dynamic Agent Selector...")
    
    # Get agent type from job context or default to host
    agent_type = getattr(ctx, 'agent_type', 'host')
    
    # Check participant metadata for agent type (from token)
    try:
        room = ctx.room
        # Look for agent type in participant metadata
        participants = []
        try:
            participants = list(getattr(room, "remote_participants", {}).values())
            if getattr(room, "local_participant", None):
                participants.append(room.local_participant)
        except Exception:
            if hasattr(room, "get_participants"):
                participants = room.get_participants()
            elif hasattr(room, "participants"):
                participants = list(room.participants.values())

        for p in participants:
            try:
                if getattr(p, "identity", None) and not p.identity.startswith("agent"):
                    meta = getattr(p, "metadata", None)
                    if meta:
                        try:
                            parsed = json.loads(meta)
                            if "agent_type" in parsed:
                                agent_type = parsed["agent_type"]
                                print(f"📋 Agent type from participant metadata: {agent_type}")
                                break
                        except Exception as e:
                            print(f"⚠️ Participant metadata parse error: {e}")
            except Exception:
                continue
    except Exception as e:
        print(f"⚠️ Could not parse participant metadata: {e}")
    
    print(f"🎯 Selected agent type: {agent_type}")
    
    # Route to appropriate agent
    if agent_type.lower() in ['host', 'ai-host', 'ai_host']:
        print("🎤 Routing to AI Host Agent...")
        await entrypoint_host(ctx)
    elif agent_type.lower() in ['guest', 'ai-guest', 'ai_guest']:
        print("👤 Routing to AI Guest Agent...")
        await entrypoint_guest(ctx)
    else:
        print(f"⚠️ Unknown agent type '{agent_type}', defaulting to Host...")
        await entrypoint_host(ctx)


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
