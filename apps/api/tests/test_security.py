from app.security import sanitize_text


def test_sanitize_text_strips_markup_and_control_chars() -> None:
    text = "Hello <script>alert('x')</script>\x00 world"

    assert sanitize_text(text) == "Hello alert('x') world"
