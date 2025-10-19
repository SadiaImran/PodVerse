"""
AI Agents Package
Contains modular agent implementations for Host and Guest roles.
"""

from agents.agent_host import HostAgent, entrypoint_host
from agents.agent_guest import GuestAgent, entrypoint_guest
from agents.base_agent import (
    query_knowledge_base,
    extract_topic_from_context,
    trigger_audio_egress,
    stop_audio_egress,
    restart_egress_with_delay
)

__all__ = [
    'HostAgent',
    'entrypoint_host',
    'GuestAgent',
    'entrypoint_guest',
    'query_knowledge_base',
    'extract_topic_from_context',
    'trigger_audio_egress',
    'stop_audio_egress',
    'restart_egress_with_delay'
]