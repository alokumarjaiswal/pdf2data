parser_registry = {}

def register_parser(name):
    """A decorator to register a new parser class in the registry."""
    def decorator(cls):
        parser_registry[name] = cls
        return cls
    return decorator

# Import parsers here to ensure they are registered upon application start.
# The act of importing the module will execute the @register_parser decorator.
from . import daybook
from . import aiparser
