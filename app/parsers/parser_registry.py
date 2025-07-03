from app.parsers.daybook import DaybookParser
from app.parsers.aiparser import AIParser

parser_registry = {
    "DaybookParser": DaybookParser,
    "AIParser": AIParser,
    # Add more parser classes here in the future
}
