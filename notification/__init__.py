"""
SEVAALERT Notification Package
"""
def __getattr__(name):
    if name in {"build_alert_message", "determine_alert_severity", "determine_event_type", "send_document_alert"}:
        import notification.notifier as notifier
        return getattr(notifier, name)
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")

__all__ = [
    "build_alert_message",
    "determine_alert_severity",
    "determine_event_type",
    "send_document_alert",
]
