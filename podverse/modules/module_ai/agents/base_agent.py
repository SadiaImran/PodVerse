"""
Base Agent Utilities - Standalone helper functions extracted from agent.py
These functions are shared between Host and Guest agents.
"""
import aiohttp
import asyncio
import json
import re
import traceback


async def query_knowledge_base(query: str, user_id: str, selected_kb_id: str) -> str:
    """Call backend /internal/respond to get context chunks for user."""
    try:
        uid = user_id or "default-user"
        kb_id = selected_kb_id
        
        # Check if we have a valid knowledge base ID
        if not kb_id:
            print(f"⚠️ No knowledge base selected (kb_id=None) for user {uid}")
            return "I don't have access to your knowledge base yet. Please make sure you've selected a knowledge base for this session."
        
        # Check if the query is too short or generic
        if len(query.strip()) < 3:
            print(f"⚠️ Query too short: '{query}'")
            return "Could you please provide more specific information about what you'd like to know?"
        
        print(f"🔍 RAG query for user_id={uid}, kb_id={kb_id} (q={query[:80]})")
        async with aiohttp.ClientSession() as session:
            form = aiohttp.FormData()
            form.add_field("query", query)
            form.add_field("user_id", uid)
            form.add_field("kb_id", kb_id)
            async with session.post(
                "http://localhost:8000/internal/respond", data=form,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                if resp.status == 200:
                    j = await resp.json()
                    context = j.get("answer_text", "No relevant information was found in your notes.")
                    print(f"📄 RAG result received ({len(context)} chars)")
                    print(f"📄 Context preview: {context[:200]}...")
                    return context
                else:
                    txt = await resp.text()
                    print(f"⚠️ RAG backend error: {txt}")
                    return "I couldn't find relevant information in your documents."
    except asyncio.TimeoutError:
        print(f"❌ query_knowledge_base timed out after 30 seconds")
        return "I'm having trouble accessing your documents right now. Please try again."
    except Exception as e:
        print(f"❌ query_knowledge_base exception: {e}")
        traceback.print_exc()
        return "Error querying knowledge base."

def extract_topic_from_context(context: str) -> str:
    """
    Try to pull a short 'topic' phrase from context:
    - first heading line
    - or first sentence under 100 chars
    """
    if not context:
        return "this topic"
    # try first non-empty line
    lines = [ln.strip() for ln in context.splitlines() if ln.strip()]
    if lines:
        first = lines[0]
        # If first line is long, try first sentence
        first_sent = re.split(r'\.|\n', first)[0].strip()
        if len(first_sent) <= 120:
            # sanitize
            first_sent = re.sub(r'\s+', ' ', first_sent)
            return first_sent
    # fallback: first sentence of full context
    m = re.search(r'(.{10,120}?)\.', context)
    if m:
        return m.group(1).strip()
    return "this topic"

async def trigger_audio_egress(room_name: str, user_id: str = None, kb_id: str = None):
    """Trigger backend route to start LiveKit audio egress with improved error handling."""
    try:
        async with aiohttp.ClientSession() as session:
            url = "http://localhost:8000/livekit/start-audio-egress"
            data = {"room_name": room_name}
            
            # Add user_id and kb_id for custom file naming
            if user_id:
                data["user_id"] = user_id
            if kb_id:
                data["kb_id"] = kb_id
            
            print(f"🎬 Triggering audio egress for room: {room_name}")
            print(f"👤 User ID: {user_id}")
            print(f"📚 KB ID: {kb_id}")
            print(f"🔗 Egress URL: {url}")
            
            async with session.post(url, data=data, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                txt = await resp.text()
                
                if resp.status == 200:
                    try:
                        response_data = json.loads(txt) if txt else {}
                        if response_data.get("success"):
                            print(f"✅ Audio egress started successfully for room: {room_name}")
                            print(f"   Egress ID: {response_data.get('egress_id', 'unknown')}")
                            print(f"   Status: {response_data.get('status', 'unknown')}")
                        else:
                            error_msg = response_data.get("error", "Unknown error")
                            status = response_data.get("status", "unknown")
                            
                            if status == "quota_exceeded":
                                print(f"⚠️ Egress quota exceeded - continuing without recording")
                                print(f"   Message: {response_data.get('message', 'Recording disabled')}")
                            else:
                                print(f"⚠️ Egress failed: {error_msg}")
                    except json.JSONDecodeError:
                        print(f"✅ Audio egress started successfully for room: {room_name}")
                        print(f"   Response: {txt}")
                else:
                    print(f"⚠️ Failed to start egress: HTTP {resp.status}")
                    print(f"   Response: {txt}")
                    
    except asyncio.TimeoutError:
        print(f"⏰ Timeout while starting egress for room: {room_name}")
    except Exception as e:
        print(f"❌ Exception in trigger_audio_egress: {e}")
        import traceback
        traceback.print_exc()


async def stop_audio_egress(room_name: str):
    """Stop LiveKit audio egress and trigger file processing."""
    try:
        async with aiohttp.ClientSession() as session:
            url = "http://localhost:8000/livekit/stop-audio-egress"
            data = {"room_name": room_name}
            
            print(f"🛑 Stopping audio egress for room: {room_name}")
            print(f"🔗 Stop Egress URL: {url}")
            
            async with session.post(url, data=data, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                txt = await resp.text()
                
                if resp.status == 200:
                    try:
                        response_data = json.loads(txt) if txt else {}
                        if response_data.get("success"):
                            print(f"✅ Audio egress stopped successfully for room: {room_name}")
                            print(f"   Egress ID: {response_data.get('egress_id', 'unknown')}")
                            print(f"   Status: {response_data.get('status', 'unknown')}")
                        else:
                            error_msg = response_data.get("error", "Unknown error")
                            print(f"⚠️ Stop egress failed: {error_msg}")
                    except json.JSONDecodeError:
                        print(f"✅ Audio egress stopped successfully for room: {room_name}")
                        print(f"   Response: {txt}")
                else:
                    print(f"⚠️ Failed to stop egress: HTTP {resp.status}")
                    print(f"   Response: {txt}")
                    
    except asyncio.TimeoutError:
        print(f"⏰ Timeout while stopping egress for room: {room_name}")
    except Exception as e:
        print(f"❌ Exception in stop_audio_egress: {e}")
        import traceback
        traceback.print_exc()


async def restart_egress_with_delay(room_name: str, user_id: str, kb_id: str):
    """Restart egress with a small delay to ensure stop completes."""
    await asyncio.sleep(1)  # Small delay to ensure stop completes
    await trigger_audio_egress(room_name, user_id, kb_id)