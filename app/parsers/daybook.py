import re
import json
import os
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any, Tuple
from pathlib import Path
from .parser_registry import register_parser

# ================================================================================
# LOGGING CONFIGURATION
# ================================================================================

def setup_parser_logging(log_file_path: str = None) -> logging.Logger:
    """
    Set up detailed logging for the parser.
    
    Args:
        log_file_path: Path to the log file. If None, creates a timestamped file in data/logs/
    
    Returns:
        Configured logger instance
    """
    if log_file_path is None:
        # Create timestamped log file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_dir = Path("data/logs")
        log_dir.mkdir(exist_ok=True)
        log_file_path = log_dir / f"parser_log_{timestamp}.log"
    
    # Create logger
    logger = logging.getLogger('daybook_parser')
    logger.setLevel(logging.DEBUG)
    
    # Clear any existing handlers
    logger.handlers.clear()
    
    # Create file handler
    file_handler = logging.FileHandler(log_file_path, mode='w', encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    
    # Create console handler for important messages
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # Create detailed formatter
    file_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(funcName)-25s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Create simple console formatter
    console_formatter = logging.Formatter('%(levelname)s: %(message)s')
    
    file_handler.setFormatter(file_formatter)
    console_handler.setFormatter(console_formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

# ================================================================================
# CONSTANTS AND CONFIGURATION
# ================================================================================

# Business-related keywords used to identify business account entries
BUSINESS_KEYWORDS = [
    'BALANCE', 'LOAN', 'A/C', 'ACCOUNT', 'EXPENCES', 'EXPENSE', 'PURCHASE',
    'SOCIETY', 'INTEREST', 'MEMBER', 'MARKETING', 'LTD', 'FERTILIZER',
    'RENT', 'AGRI', 'IMP', 'RECOVERABLE', 'INCOME', 'OPENING', 'CLOSING', 
    'STOCK', 'CAPITAL', 'PROFIT', 'LOSS', 'SALES', 'CASH', 'BANK', 
    'MARKFED', 'IFFCO', 'CCB', 'CREDIT'
]

# Default organization details
DEFAULT_SOCIETY_NAME = "The Rajewal Bhumiantavi Cooperative Agricultural Society Ltd."
DEFAULT_VILLAGE_NAME = "Rajewal"

# ================================================================================
# MAIN PARSER CLASS
# ================================================================================

@register_parser("DaybookParser")
class DaybookParser:
    """
    A comprehensive parser for extracting structured data from daybook PDF text.
    
    This parser handles the complex task of converting unstructured daybook text into
    organized JSON data. It uses a multi-strategy approach to handle various entry types
    and formats commonly found in daybook documents.
    
    Key Features:
    - Handles 4 different entry types (business accounts, transactions, person names, etc.)
    - Processes side-by-side credit/debit columns
    - Manages complex line patterns with multiple entries
    - Converts amounts to Indian number format words
    - Comprehensive logging for debugging and analysis
    
    Usage:
        parser = DaybookParser()
        tables = parser.parse_content(text_content)
    """
    
    def __init__(self, enable_logging: bool = True, log_file_path: str = None):
        """
        Initialize the parser with compiled regex patterns and logging.
        
        Args:
            enable_logging: Whether to enable detailed logging
            log_file_path: Path to log file. If None, creates timestamped file
        """
        self.enable_logging = enable_logging
        
        if enable_logging:
            self.logger = setup_parser_logging(log_file_path)
            self.logger.info("=" * 80)
            self.logger.info("🚀 Daybook Parser Initialized")
            self.logger.info("=" * 80)
        else:
            self.logger = None
            
        # Initialize statistics
        self.stats = {
            'total_lines_processed': 0,
            'lines_ignored': 0,
            'lines_parsed_successfully': 0,
            'tables_found': 0,
            'entries_extracted': 0,
            'parsing_errors': 0
        }
        
        self._compile_regex_patterns()
    
    # ============================================================================
    # INITIALIZATION AND PATTERN COMPILATION
    # ============================================================================
    
    def _compile_regex_patterns(self):
        """
        Compile all regex patterns used for parsing.
        
        Patterns are ordered by specificity (most specific first) to ensure
        accurate matching. Each pattern targets a specific type of entry format.
        """
        # Entry patterns - ordered from most specific to most general
        self.patterns = {
            # Type 3: Person name with S/O/W/O + account number + amount (MOST SPECIFIC)
            # Example: "SUKHJIT SINGH S/O KEHAR SINGH 166 106000.00"
            'type3_name_account': re.compile(
                r'^([A-Z][A-Z\s]+(?:S/O|W/O)\s+[A-Z\s]+[A-Z])\s+(\d{1,4})\s+(\d+\.?\d*)$'
            ),
            
            # Type 2: Transaction entries (To/By/Bill) - excludes S/O patterns
            # Example: "To Cash 260.00", "By Bill No : 11 28700.00"
            'type2_to_by_bill': re.compile(
                r'^((?:To|By)\s+(?!.*(?:S/O|W/O))[^0-9]+|(?:(?:Sale\s+)?Bill No)[:\s]*[0-9]*(?!.*(?:S/O|W/O))[^0-9]*)\s+(\d+\.?\d*)$'
            ),
            
            # Type 1: Business accounts with specific keywords
            # Example: "OPENING BALANCE 8965.42", "CCB STA LOAN B/F A/C 550340.00", "REPAIR AGRI IMP. 1180.00"
            'type1_business': re.compile(
                r'^([A-Z][A-Z\s/\.\-]*(?:' + '|'.join(BUSINESS_KEYWORDS) + r')[A-Z\s/\.\-]*)\s+(\d+\.?\d*)$'
            ),
            
            # Type 4: Simple person name + amount (MOST GENERAL)
            # Example: "HARINDER SINGH 50000.00"
            'type4_person_name': re.compile(
                r'^([A-Z][A-Z\s]{2,}[A-Z])\s+(\d+\.?\d*)$'
            )
        }
        
        # Table structure patterns
        self.daybook_start = re.compile(r'Daybook\s+(\d{2}-\d{2}-\d{4})')
        self.grand_total = re.compile(r'Grand Total\s+(\d+\.?\d*)\s+Grand Total\s+(\d+\.?\d*)')
        
        # Summary field patterns
        self.total_pattern = re.compile(r'Total\s+(\d+\.?\d*)')
        self.cash_in_hand_pattern = re.compile(r'Cash In Hand\s+(\d+\.?\d*)')
    
    # ============================================================================
    # PUBLIC API METHODS
    # ============================================================================
    
    def parse_text_file(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Parse a text file containing extracted daybook content.
        
        Args:
            file_path: Path to the text file to parse
            
        Returns:
            List of dictionaries, each representing a parsed daybook table
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return self.parse_content(content)
    
    def parse_content(self, content: str) -> List[Dict[str, Any]]:
        """
        Parse daybook content and extract all tables.
        
        This is the main entry point for parsing. It identifies individual daybook
        tables within the content and processes each one separately.
        
        Args:
            content: Raw text content from the daybook
            
        Returns:
            List of structured table data dictionaries
        """
        if self.logger:
            self.logger.info(f"📝 Starting to parse content ({len(content):,} characters)")
            
        tables = []
        lines = content.split('\n')
        self.stats['total_lines_processed'] = len(lines)
        
        if self.logger:
            self.logger.info(f"📄 Total lines to process: {len(lines)}")
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Log every line for debugging
            if self.logger:
                self.logger.debug(f"Line {i+1:4d}: '{line}'")
            
            # Look for the start of a daybook table
            match = self.daybook_start.search(lines[i])
            if match:
                date = match.group(1)
                if self.logger:
                    self.logger.info(f"📅 Found daybook table starting at line {i+1} with date: {date}")
                
                table_data, end_index = self._parse_single_table(lines, i, date)
                if table_data:
                    tables.append(table_data)
                    self.stats['tables_found'] += 1
                    if self.logger:
                        entries_count = len(table_data.get('entries', []))
                        self.logger.info(f"✅ Table parsed successfully: {entries_count} entries extracted")
                        self.stats['entries_extracted'] += entries_count
                i = end_index
            else:
                i += 1
        
        if self.logger:
            self.logger.info("=" * 60)
            self.logger.info("📊 PARSING SUMMARY:")
            self.logger.info(f"   Total lines processed: {self.stats['total_lines_processed']}")
            self.logger.info(f"   Tables found: {self.stats['tables_found']}")
            self.logger.info(f"   Entries extracted: {self.stats['entries_extracted']}")
            self.logger.info(f"   Lines ignored: {self.stats['lines_ignored']}")
            self.logger.info(f"   Lines parsed successfully: {self.stats['lines_parsed_successfully']}")
            self.logger.info(f"   Parsing errors: {self.stats['parsing_errors']}")
            self.logger.info("=" * 60)
        
        return tables
    
    # ============================================================================
    # TABLE-LEVEL PARSING METHODS
    # ============================================================================
    
    def _parse_single_table(self, lines: List[str], start_index: int, date: str) -> tuple:
        """
        Parse a single daybook table from start to Grand Total.
        
        Args:
            lines: All lines from the document
            start_index: Index where this table starts
            date: Date of the daybook table
            
        Returns:
            Tuple of (table_data_dict, next_line_index)
        """
        totals = {}
        table_content_lines = []
        
        i = start_index + 1
        
        # Collect all lines belonging to this table
        while i < len(lines):
            line = lines[i].strip()
            
            # Check for end of table (Grand Total)
            if self.grand_total.search(line):
                gt_match = self.grand_total.search(line)
                if gt_match:
                    totals['grand_total_credit'] = float(gt_match.group(1))
                    totals['grand_total_debit'] = float(gt_match.group(2))
                break
            
            # Extract summary fields
            if self._extract_summary_field(line, totals):
                i += 1
                continue
            
            # Collect content lines (skip headers and separators)
            if self._is_content_line(line):
                table_content_lines.append(line)
            
            i += 1
        
        # Parse the collected entry lines
        entries = self._extract_entries_from_content(table_content_lines)
        
        # Build the final table structure
        table_data = self._build_table_structure(date, entries, totals)
        
        return table_data, i + 1
    
    def _extract_summary_field(self, line: str, totals: Dict) -> bool:
        """
        Extract summary fields like Total and Cash In Hand from a line.
        
        Args:
            line: Line to check for summary fields
            totals: Dictionary to update with found totals
            
        Returns:
            True if a summary field was found and extracted
        """
        total_match = self.total_pattern.search(line)
        if total_match:
            totals['total_debit'] = float(total_match.group(1))
            return True
        
        cash_match = self.cash_in_hand_pattern.search(line)
        if cash_match:
            totals['cash_in_hand'] = float(cash_match.group(1))
            return True
        
        return False
    
    def _is_content_line(self, line: str) -> bool:
        """Check if a line contains actual entry content (not headers/separators)."""
        return (line and 
                not line.startswith('---') and 
                'Credit Debit' not in line)
    
    def _build_table_structure(self, date: str, entries: List[Dict], totals: Dict) -> Dict[str, Any]:
        """Build the final structured table data."""
        return {
            "society_name": DEFAULT_SOCIETY_NAME,
            "village_name": DEFAULT_VILLAGE_NAME,
            "date": date,
            "entries": entries,
            "totals": totals,
            "amount_in_words": self._convert_amount_to_words(totals.get('grand_total_credit', 0))
        }
    
    # ============================================================================
    # LINE-LEVEL PARSING METHODS
    # ============================================================================
    
    def _extract_entries_from_content(self, content_lines: List[str]) -> List[Dict[str, Any]]:
        """
        Extract individual entries from content lines.
        
        Each line may contain side-by-side credit/debit entries that need to be
        separated and parsed individually.
        
        Args:
            content_lines: List of content lines from a daybook table
            
        Returns:
            List of parsed entry dictionaries
        """
        all_entries = []
        
        for line in content_lines:
            line = line.strip()
            if not line:
                continue
            
            # Parse this line (may contain multiple entries)
            line_entries = self._parse_tabular_line(line)
            all_entries.extend(line_entries)
        
        return all_entries
    
    def _parse_tabular_line(self, line: str) -> List[Dict[str, Any]]:
        """
        Parse a line that may contain multiple credit/debit entries side by side.
        
        This is the core parsing logic that handles the complexity of daybook
        formatting where multiple entries can appear on the same line.
        
        Strategy:
        1. Try combined patterns (most specific)
        2. Try clear separators (spaces, keywords)
        3. Try amount-based splitting
        4. Try packed entry analysis
        5. Fallback to single entry parsing
        
        Args:
            line: Single line of text to parse
            
        Returns:
            List of entry dictionaries found in the line
        """
        if self.logger:
            self.logger.debug(f"🔍 Parsing tabular line: '{line}'")
        
        # Strategy 1: Try combined patterns first (most reliable)
        entries = self._try_combined_patterns(line)
        if entries:
            if self.logger:
                self.logger.debug(f"✅ Strategy 1 (Combined patterns) succeeded: {len(entries)} entries")
            self.stats['lines_parsed_successfully'] += 1
            return entries
        
        # Strategy 2: Try clear separator-based splitting
        entries = self._try_separator_splitting(line)
        if entries:
            if self.logger:
                self.logger.debug(f"✅ Strategy 2 (Separator splitting) succeeded: {len(entries)} entries")
            self.stats['lines_parsed_successfully'] += 1
            return entries
        
        # Strategy 3: Try amount-based splitting
        entries = self._try_amount_based_splitting(line)
        if entries:
            if self.logger:
                self.logger.debug(f"✅ Strategy 3 (Amount-based splitting) succeeded: {len(entries)} entries")
            self.stats['lines_parsed_successfully'] += 1
            return entries
        
        # Strategy 4: Try packed entry analysis
        entries = self._try_packed_entry_analysis(line)
        if entries:
            if self.logger:
                self.logger.debug(f"✅ Strategy 4 (Packed entry analysis) succeeded: {len(entries)} entries")
            self.stats['lines_parsed_successfully'] += 1
            return entries
        
        # Strategy 5: Fallback - try as single entry
        entry = self._parse_single_entry(line)
        if entry:
            if self.logger:
                self.logger.debug(f"✅ Strategy 5 (Single entry fallback) succeeded: 1 entry")
            self.stats['lines_parsed_successfully'] += 1
            return [entry]
        
        # No pattern matched - log this as an ignored line
        if self.logger:
            self.logger.warning(f"❌ Line IGNORED (no pattern matched): '{line}'")
        self.stats['lines_ignored'] += 1
        return []
    
    # ============================================================================
    # PARSING STRATEGY METHODS
    # ============================================================================
    
    def _try_combined_patterns(self, line: str) -> Optional[List[Dict[str, Any]]]:
        """
        Strategy 1: Try specific combined patterns for complex lines.
        
        These patterns handle cases where two distinct entries are clearly
        defined in a single line with specific formatting.
        """
        pattern_methods = [
            self._parse_person_amount_bill_pattern,
            self._parse_amount_bill_amount_pattern,
            self._parse_by_bill_amount_person_pattern,
            self._parse_bill_amount_bill_amount_pattern,
            self._parse_bill_amount_account_amount_pattern,
            self._parse_bill_amount_person_amount_pattern,
            self._parse_transaction_amount_person_amount_pattern,
            self._parse_transaction_person_pattern,
            self._parse_transfer_business_pattern,
            self._parse_business_person_pattern,
        ]
        
        for method in pattern_methods:
            entries = method(line)
            if entries:
                return entries
        
        return None
    
    def _try_separator_splitting(self, line: str) -> Optional[List[Dict[str, Any]]]:
        """
        Strategy 2: Try to split the line based on clear separators.
        
        Looks for obvious separators like multiple spaces or keywords
        that typically separate credit and debit columns.
        """
        # Define separator patterns
        separators = [
            r'\s+To\s+',      # " To "
            r'\s+By\s+',      # " By "
            r'\s{4,}',        # 4+ consecutive spaces
        ]
        
        # Add " Bill " separator only if not part of "Sale Bill No" pattern
        if not re.search(r'(?:Sale\s+)?Bill\s+No\s*:', line):
            separators.append(r'\s+Bill\s+')
        
        for separator in separators:
            parts = re.split(separator, line, maxsplit=1)
            if len(parts) == 2:
                left_part, right_part = parts[0].strip(), parts[1].strip()
                
                # Restore keyword separators to the right part
                if 'To' in separator:
                    right_part = 'To ' + right_part
                elif 'By' in separator:
                    right_part = 'By ' + right_part
                elif 'Bill' in separator:
                    right_part = 'Bill ' + right_part
                
                # Parse both parts
                entries = []
                left_entry = self._parse_single_entry(left_part)
                if left_entry:
                    entries.append(left_entry)
                
                right_entry = self._parse_single_entry(right_part)
                if right_entry:
                    entries.append(right_entry)
                
                if entries:
                    return entries
        
        return None
    
    def _try_amount_based_splitting(self, line: str) -> Optional[List[Dict[str, Any]]]:
        """
        Strategy 3: Split line based on amount positions.
        
        If there are exactly two amounts, try different split points to find
        the best way to separate two complete entries.
        """
        words = line.split()
        amount_positions = [i for i, word in enumerate(words) 
                          if re.match(r'^\d+\.?\d*$', word)]
        
        if len(amount_positions) == 2:
            first_amount_pos = amount_positions[0]
            second_amount_pos = amount_positions[1]
            
            # Try splitting after the first amount (most common case)
            split_point = first_amount_pos + 1
            left_text = ' '.join(words[:split_point])
            right_text = ' '.join(words[split_point:])
            
            entries = []
            left_entry = self._parse_single_entry(left_text)
            right_entry = self._parse_single_entry(right_text)
            
            if left_entry and right_entry:
                entries.append(left_entry)
                entries.append(right_entry)
                return entries
            
            # If that didn't work, try splitting before the second amount
            # This handles cases where there might be text between entries
            for split_point in range(first_amount_pos + 1, second_amount_pos):
                left_text = ' '.join(words[:split_point])
                right_text = ' '.join(words[split_point:])
                
                left_entry = self._parse_single_entry(left_text)
                right_entry = self._parse_single_entry(right_text)
                
                if left_entry and right_entry:
                    entries = [left_entry, right_entry]
                    return entries
        
        return None
    
    def _try_packed_entry_analysis(self, line: str) -> Optional[List[Dict[str, Any]]]:
        """
        Strategy 4: Analyze lines with tightly packed entries.
        
        Uses heuristics to detect when multiple entries are packed together
        without clear separators.
        """
        words = line.split()
        so_count = sum(1 for word in words if word == "S/O")
        amount_count = sum(1 for word in words if re.match(r'^\d+\.?\d*$', word))
        business_term_count = sum(1 for word in words 
                                if any(term in word.upper() for term in BUSINESS_KEYWORDS))
        
        # Heuristic: Line likely contains multiple entries if:
        # - Multiple S/O patterns (person names)
        # - 3+ amounts
        # - 2+ amounts with business terms
        if (so_count >= 2 or 
            amount_count >= 3 or 
            (amount_count >= 2 and business_term_count >= 1)):
            return self._parse_packed_entries(line)
        
        return None
    
    # ============================================================================
    # SINGLE ENTRY PARSING
    # ============================================================================
    
    def _parse_single_entry(self, entry_text: str) -> Optional[Dict[str, Any]]:
        """
        Parse a single entry text into structured data.
        
        Tries patterns in order of specificity (most specific first) to ensure
        accurate classification of the entry type.
        
        Args:
            entry_text: Text representing a single entry
            
        Returns:
            Dictionary with entry data or None if no pattern matches
        """
        entry_text = entry_text.strip()
        if not entry_text:
            return None
        
        if self.logger:
            self.logger.debug(f"  🔍 Parsing single entry: '{entry_text}'")
        
        # Try each pattern in order of specificity
        for pattern_name, pattern in self.patterns.items():
            match = pattern.match(entry_text)
            if match:
                entry = self._create_entry_from_match(pattern_name, match)
                if entry:
                    if self.logger:
                        self.logger.debug(f"    ✅ Matched pattern '{pattern_name}': {entry['account_name']}")
                    return entry
                else:
                    if self.logger:
                        self.logger.debug(f"    ⚠️ Pattern '{pattern_name}' matched but entry creation failed")
        
        # Fallback: Try simple pattern matching
        fallback_entry = self._try_fallback_pattern(entry_text)
        if fallback_entry:
            if self.logger:
                self.logger.debug(f"    ✅ Fallback pattern succeeded: {fallback_entry['account_name']}")
            return fallback_entry
        
        if self.logger:
            self.logger.debug(f"    ❌ No pattern matched for: '{entry_text}'")
        
        return None
    
    def _create_entry_from_match(self, pattern_name: str, match) -> Dict[str, Any]:
        """Create an entry dictionary from a regex match based on pattern type."""
        if pattern_name == 'type3_name_account':
            # Person with S/O/W/O, account number, and amount
            return {
                "account_name": match.group(1).strip(),
                "account_number": int(match.group(2)),
                "amount": float(match.group(3)),
                "total_amount": None
            }
        elif pattern_name == 'type2_to_by_bill':
            # Transaction or bill entry
            return {
                "account_name": match.group(1).strip(),
                "account_number": None,
                "amount": float(match.group(2)),
                "total_amount": None
            }
        elif pattern_name == 'type1_business':
            # Business account entry
            return {
                "account_name": match.group(1).strip(),
                "account_number": None,
                "amount": None,
                "total_amount": float(match.group(2))
            }
        elif pattern_name == 'type4_person_name':
            # Simple person name + amount (only if not a business account)
            account_name = match.group(1).strip()
            if not self._contains_business_terms(account_name):
                return {
                    "account_name": account_name,
                    "account_number": None,
                    "amount": float(match.group(2)),
                    "total_amount": None
                }
        
        return None
    
    def _try_fallback_pattern(self, entry_text: str) -> Optional[Dict[str, Any]]:
        """Try a simple fallback pattern for entries that don't match main patterns."""
        simple_pattern = re.compile(r'^(.+?)\s+(\d+\.?\d*)$')
        match = simple_pattern.match(entry_text)
        
        if match:
            account_name = match.group(1).strip()
            amount = float(match.group(2))
            
            # Classify based on content
            if self._contains_business_terms(account_name):
                return {
                    "account_name": account_name,
                    "account_number": None,
                    "amount": None,
                    "total_amount": amount
                }
            else:
                return {
                    "account_name": account_name,
                    "account_number": None,
                    "amount": amount,
                    "total_amount": None
                }
        
        return None
    
    # ============================================================================
    # UTILITY AND HELPER METHODS
    # ============================================================================
    
    def _contains_business_terms(self, name: str) -> bool:
        """Check if a name contains any business-related keywords."""
        name_upper = name.upper()
        return any(term in name_upper for term in BUSINESS_KEYWORDS)
    
    def save_parsed_data(self, parsed_data: List[Dict[str, Any]], output_path: str) -> str:
        """Save parsed data to a JSON file."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(parsed_data, f, indent=2, ensure_ascii=False)
        
        return output_path

    # ============================================================================
    # COMPLEX PATTERN PARSING METHODS
    # ============================================================================
    
    def _parse_packed_entries(self, line: str) -> List[Dict[str, Any]]:
        """
        Handle cases where entries are tightly packed without clear separators.
        
        This method handles the most complex parsing scenarios where multiple
        entries are squeezed together on a single line without clear formatting.
        """
        entries = []
        words = line.split()
        
        # First, try to identify Type 3 patterns (Name S/O Name + account_number + amount) as these are very distinctive
        type3_matches = self._find_type3_patterns(words)
        
        if len(type3_matches) >= 2:
            # We found multiple Type 3 entries, extract them
            for match in type3_matches:
                start_idx, end_idx, entry_text = match
                entry = self._parse_single_entry(entry_text)
                if entry:
                    entries.append(entry)
            
            # Also look for any remaining entries in the gaps
            used_indices = set()
            for start_idx, end_idx, _ in type3_matches:
                used_indices.update(range(start_idx, end_idx + 1))
            
            # Check for entries in unused word ranges
            remaining_words = []
            for i, word in enumerate(words):
                if i not in used_indices:
                    remaining_words.append(word)
            
            if remaining_words:
                remaining_text = ' '.join(remaining_words)
                remaining_entry = self._parse_single_entry(remaining_text)
                if remaining_entry:
                    entries.append(remaining_entry)
        
        else:
            # Try to identify transfer + business account pattern first
            transfer_business_entries = self._parse_transfer_business_pattern(line)
            if transfer_business_entries:
                entries = transfer_business_entries
            else:
                # Try to identify business account followed by person account pattern
                business_person_entries = self._parse_business_person_pattern(line)
                if business_person_entries:
                    entries = business_person_entries
                else:
                    # Try to identify business account boundaries using business terms and amounts
                    entries = self._parse_business_entries(words)
                    
                    # If that didn't work well, fallback to the original greedy approach
                    if len(entries) == 0:
                        entries = self._parse_single_packed_entry(words)
        
        return entries
    
    def _parse_business_person_pattern(self, line: str) -> List[Dict[str, Any]]:
        """
        Parse patterns like: "INTEREST MEMBER ST LOAN 1331.00 HARINDER SINGH S/O AMAR SINGH 833 48000.00"
        Where we have a business account followed by a person account.
        """
        entries = []
        
        # Look for the pattern: Business_Terms Amount PersonName S/O PersonName AccountNumber Amount
        # Pattern: business terms + amount + S/O pattern + account number + amount
        pattern = r'^(.+?)\s+(\d+\.?\d*)\s+([A-Z][A-Z\s]+S/O\s+[A-Z\s]+[A-Z])\s+(\d{1,4})\s+(\d+\.?\d*)$'
        match = re.match(pattern, line)
        
        if match:
            business_name = match.group(1).strip()
            business_amount = float(match.group(2))
            person_name = match.group(3).strip()
            account_number = int(match.group(4))
            person_amount = float(match.group(5))
            
            # Check if the business part contains business terms
            if self._contains_business_terms(business_name):
                # Create business account entry
                business_entry = {
                    "account_name": business_name,
                    "account_number": None,
                    "amount": None,
                    "total_amount": business_amount
                }
                entries.append(business_entry)
                
                # Create person account entry
                person_entry = {
                    "account_name": person_name,
                    "account_number": account_number,
                    "amount": person_amount,
                    "total_amount": None
                }
                entries.append(person_entry)
        
        return entries
    
    def _parse_transfer_business_pattern(self, line: str) -> List[Dict[str, Any]]:
        """
        Parse patterns like: "Transfer To Opening Stock 1446959.39 NEWS PAPER EXP. A/C. 2640.00"
        Where we have a transfer entry followed by a business account.
        """
        entries = []
        
        # Look for the pattern: Transfer/To/By terms + amount + business account + amount
        pattern = r'^((?:Transfer\s+)?(?:To|By)\s+[^0-9]+?)\s+(\d+\.?\d*)\s+([A-Z][A-Z\s/\.\-]*(?:A/C|ACCOUNT|EXP|EXPENCES|EXPENSE)[A-Z\s/\.\-]*)\s+(\d+\.?\d*)$'
        match = re.match(pattern, line)
        
        if match:
            transfer_name = match.group(1).strip()
            transfer_amount = float(match.group(2))
            business_name = match.group(3).strip()
            business_amount = float(match.group(4))
            
            # Create transfer entry
            transfer_entry = {
                "account_name": transfer_name,
                "account_number": None,
                "amount": transfer_amount,
                "total_amount": None
            }
            entries.append(transfer_entry)
            
            # Create business account entry
            business_entry = {
                "account_name": business_name,
                "account_number": None,
                "amount": None,
                "total_amount": business_amount
            }
            entries.append(business_entry)
        
        return entries
    
    def _parse_transaction_person_pattern(self, line: str) -> List[Dict[str, Any]]:
        """
        Parse patterns like: "By Transfer 13860.00 BALWINDER SINGH S/O MUKHTIAR SINGH 201"
        Where we have a transaction entry followed by a person name with account number.
        """
        entries = []
        
        # Look for the pattern: (To|By) + transaction type + amount + person name + S/O + father name + account number
        pattern = r'^((?:To|By)\s+[A-Za-z\s]+?)\s+(\d+\.?\d*)\s+([A-Z][A-Z\s]+S/O\s+[A-Z\s]+[A-Z])\s+(\d{1,4})$'
        match = re.match(pattern, line)
        
        if match:
            transaction_name = match.group(1).strip()
            transaction_amount = float(match.group(2))
            person_name = match.group(3).strip()
            account_number = int(match.group(4))
            
            # Create transaction entry
            transaction_entry = {
                "account_name": transaction_name,
                "account_number": None,
                "amount": transaction_amount,
                "total_amount": None
            }
            entries.append(transaction_entry)
            
            # Create person entry
            person_entry = {
                "account_name": person_name,
                "account_number": account_number,
                "amount": None,
                "total_amount": None
            }
            entries.append(person_entry)
        
        return entries
    
    def _parse_transaction_amount_person_amount_pattern(self, line: str) -> List[Dict[str, Any]]:
        """
        Parse patterns like: "By Transfer 648000.00 LAKHVIR SINGH S/O NACHHATER SINGH 287 100000.00"
        Where we have a transaction entry with amount followed by a person name with account number and another amount.
        """
        entries = []
        
        # Look for the pattern: (To|By) + transaction type + amount + person name + S/O + father name + account number + amount
        pattern = r'^((?:To|By)\s+[A-Za-z\s]+?)\s+(\d+\.?\d*)\s+([A-Z][A-Z\s]+S/O\s+[A-Z\s]+[A-Z])\s+(\d{1,4})\s+(\d+\.?\d*)$'
        match = re.match(pattern, line)
        
        if match:
            transaction_name = match.group(1).strip()
            transaction_amount = float(match.group(2))
            person_name = match.group(3).strip()
            account_number = int(match.group(4))
            person_amount = float(match.group(5))
            
            # Create transaction entry
            transaction_entry = {
                "account_name": transaction_name,
                "account_number": None,
                "amount": transaction_amount,
                "total_amount": None
            }
            entries.append(transaction_entry)
            
            # Create person entry  
            person_entry = {
                "account_name": person_name,
                "account_number": account_number,
                "amount": person_amount,
                "total_amount": None
            }
            entries.append(person_entry)
        
        return entries

    def _parse_bill_amount_person_amount_pattern(self, line: str) -> List[Dict[str, Any]]:
        """
        Parse patterns like: "Bill No :MS/24-25/411 14619.10 BALVIR KAUR W/O BHAG SINGH 200 30.00"
        Where we have a bill entry with amount followed by a person name with account number and another amount.
        """
        entries = []
        
        # Look for the pattern: Bill + amount + person name + account number + amount
        pattern = r'^((?:Sale\s+)?Bill\s+No\s*:\s*[A-Z0-9/\-]+)\s+(\d+\.?\d*)\s+([A-Z][A-Z\s]+(?:W/O|S/O)\s+[A-Z\s]+[A-Z])\s+(\d{1,4})\s+(\d+\.?\d*)$'
        match = re.match(pattern, line)
        
        if match:
            bill_name = match.group(1).strip()
            bill_amount = float(match.group(2))
            person_name = match.group(3).strip()
            account_number = int(match.group(4))
            person_amount = float(match.group(5))
            
            # Create bill entry
            bill_entry = {
                "account_name": bill_name,
                "account_number": None,
                "amount": bill_amount,
                "total_amount": None
            }
            entries.append(bill_entry)
            
            # Create person entry  
            person_entry = {
                "account_name": person_name,
                "account_number": account_number,
                "amount": person_amount,
                "total_amount": None
            }
            entries.append(person_entry)
        
        return entries

    def _parse_person_amount_bill_pattern(self, line: str) -> List[Dict[str, Any]]:
        """
        Parse patterns like: "KULDEEP SINGH S/O KAKA SINGH 693 44950.00 Purchase Bill No :SFE/22400586"
        Where we have a person name with account number and amount followed by a bill.
        """
        entries = []
        
        # Look for the pattern: person name + S/O/W/O + account number + amount + bill
        pattern = r'^([A-Z][A-Z\s]+(?:W/O|S/O)\s+[A-Z\s]+[A-Z])\s+(\d{1,4})\s+(\d+\.?\d*)\s+((?:Purchase\s+)?Bill\s+No\s*:\s*[A-Z0-9/\-]+)$'
        match = re.match(pattern, line)
        
        if match:
            person_name = match.group(1).strip()
            account_number = int(match.group(2))
            person_amount = float(match.group(3))
            bill_name = match.group(4).strip()
            
            # Create person entry
            person_entry = {
                "account_name": person_name,
                "account_number": account_number,
                "amount": person_amount,
                "total_amount": None
            }
            entries.append(person_entry)
            
            # Create bill entry
            bill_entry = {
                "account_name": bill_name,
                "account_number": None,
                "amount": None,
                "total_amount": None
            }
            entries.append(bill_entry)
        
        return entries
    
    def _parse_by_bill_amount_person_pattern(self, line: str) -> List[Dict[str, Any]]:
        """
        Parse patterns like: "By Bill No : 11 28700.00 AVTAR SINGH S/O BHAJAN SINGH 710"
        Where we have "By" + bill + amount + person name + account number.
        """
        entries = []
        
        # Look for the pattern: By + Bill + amount + person name + account number
        pattern = r'^By\s+((?:Purchase\s+)?Bill\s+No\s*:\s*[A-Z0-9/\-]+)\s+(\d+\.?\d*)\s+([A-Z][A-Z\s]+(?:W/O|S/O)\s+[A-Z\s]+[A-Z])\s+(\d{1,4})$'
        match = re.match(pattern, line)
        
        if match:
            bill_name = "By " + match.group(1).strip()
            bill_amount = float(match.group(2))
            person_name = match.group(3).strip()
            account_number = int(match.group(4))
            
            # Create bill entry
            bill_entry = {
                "account_name": bill_name,
                "account_number": None,
                "amount": bill_amount,
                "total_amount": None
            }
            entries.append(bill_entry)
            
            # Create person entry
            person_entry = {
                "account_name": person_name,
                "account_number": account_number,
                "amount": None,
                "total_amount": None
            }
            entries.append(person_entry)
        
        return entries

    def _parse_amount_bill_amount_pattern(self, line: str) -> List[Dict[str, Any]]:
        """
        Parse patterns like: "KULDEEP SINGH S/O KAKA SINGH 693 44950.00 Purchase Bill No :SFE/22400586 4235.00"
        Where we have a person/account name with amount followed by a bill with another amount.
        """
        entries = []
        
        # Pattern 1: Person + account + amount + bill + amount
        pattern1 = r'^([A-Z][A-Z\s]+(?:W/O|S/O)\s+[A-Z\s]+[A-Z])\s+(\d{1,4})\s+(\d+\.?\d*)\s+((?:Purchase\s+)?Bill\s+No\s*:\s*[A-Z0-9/\-]+)\s+(\d+\.?\d*)$'
        match1 = re.match(pattern1, line)
        
        if match1:
            person_name = match1.group(1).strip()
            account_number = int(match1.group(2))
            person_amount = float(match1.group(3))
            bill_name = match1.group(4).strip()
            bill_amount = float(match1.group(5))
            
            # Create person entry
            person_entry = {
                "account_name": person_name,
                "account_number": account_number,
                "amount": person_amount,
                "total_amount": None
            }
            entries.append(person_entry)
            
            # Create bill entry
            bill_entry = {
                "account_name": bill_name,
                "account_number": None,
                "amount": None,
                "total_amount": bill_amount
            }
            entries.append(bill_entry)
            return entries
        
        # Pattern 2: Business account + amount + bill + amount
        pattern2 = r'^([A-Z][A-Z\s/\.\-]*(?:A/C|ACCOUNT|LOAN|MEMBER|SOCIETY|BALANCE|MARKFED|IFFCO|CCB|INTEREST)[A-Z\s/\.\-]*)\s+(\d+\.?\d*)\s+((?:Purchase\s+)?Bill\s+No\s*:\s*[A-Z0-9/\-]+)\s+(\d+\.?\d*)$'
        match2 = re.match(pattern2, line)
        
        if match2:
            business_name = match2.group(1).strip()
            business_amount = float(match2.group(2))
            bill_name = match2.group(3).strip()
            bill_amount = float(match2.group(4))
            
            # Create business entry
            business_entry = {
                "account_name": business_name,
                "account_number": None,
                "amount": business_amount,
                "total_amount": None
            }
            entries.append(business_entry)
            
            # Create bill entry
            bill_entry = {
                "account_name": bill_name,
                "account_number": None,
                "amount": None,
                "total_amount": bill_amount
            }
            entries.append(bill_entry)
            return entries
        
        # Pattern 3: Person without account + amount + bill + amount
        pattern3 = r'^([A-Z][A-Z\s]+(?:W/O|S/O)\s+[A-Z\s]+[A-Z])\s+(\d+\.?\d*)\s+((?:Purchase\s+)?Bill\s+No\s*:\s*[A-Z0-9/\-]+)\s+(\d+\.?\d*)$'
        match3 = re.match(pattern3, line)
        
        if match3:
            person_name = match3.group(1).strip()
            person_amount = float(match3.group(2))
            bill_name = match3.group(3).strip()
            bill_amount = float(match3.group(4))
            
            # Create person entry
            person_entry = {
                "account_name": person_name,
                "account_number": None,
                "amount": person_amount,
                "total_amount": None
            }
            entries.append(person_entry)
            
            # Create bill entry
            bill_entry = {
                "account_name": bill_name,
                "account_number": None,
                "amount": None,
                "total_amount": bill_amount
            }
            entries.append(bill_entry)
            return entries
        
        return entries

    def _parse_bill_amount_bill_amount_pattern(self, line: str) -> List[Dict[str, Any]]:
        """
        Parse patterns like: "By Bill No : 136 132151.00 Purchase Bill No :136 10079.60"
        Where we have a bill with amount followed by another bill with amount.
        """
        entries = []
        
        # Pattern: By Bill + amount + Bill + amount
        pattern = r'^(By\s+(?:Purchase\s+)?Bill\s+No\s*:\s*[A-Z0-9/\-]+)\s+(\d+\.?\d*)\s+((?:Purchase\s+)?Bill\s+No\s*:\s*[A-Z0-9/\-]+)\s+(\d+\.?\d*)$'
        match = re.match(pattern, line)
        
        if match:
            first_bill_name = match.group(1).strip()
            first_bill_amount = float(match.group(2))
            second_bill_name = match.group(3).strip()
            second_bill_amount = float(match.group(4))
            
            # Create first bill entry
            first_bill_entry = {
                "account_name": first_bill_name,
                "account_number": None,
                "amount": first_bill_amount,
                "total_amount": None
            }
            entries.append(first_bill_entry)
            
            # Create second bill entry
            second_bill_entry = {
                "account_name": second_bill_name,
                "account_number": None,
                "amount": None,
                "total_amount": second_bill_amount
            }
            entries.append(second_bill_entry)
        
        return entries

    def _parse_bill_amount_account_amount_pattern(self, line: str) -> List[Dict[str, Any]]:
        """
        Parse patterns like: "By Bill No : 172 58218.00 CASH CREDIT FERTILIZER 196113.00"
        Where we have a bill with amount followed by an account with amount.
        """
        entries = []
        
        # Pattern: By Bill + amount + Account + amount
        pattern = r'^(By\s+(?:Purchase\s+)?Bill\s+No\s*:\s*[A-Z0-9/\-]+)\s+(\d+\.?\d*)\s+([A-Z][A-Z\s/\.\-]*(?:A/C|ACCOUNT|LOAN|MEMBER|SOCIETY|BALANCE|MARKFED|IFFCO|CCB|INTEREST|FERTILIZER|CREDIT)[A-Z\s/\.\-]*)\s+(\d+\.?\d*)$'
        match = re.match(pattern, line)
        
        if match:
            bill_name = match.group(1).strip()
            bill_amount = float(match.group(2))
            account_name = match.group(3).strip()
            account_amount = float(match.group(4))
            
            # Create bill entry
            bill_entry = {
                "account_name": bill_name,
                "account_number": None,
                "amount": bill_amount,
                "total_amount": None
            }
            entries.append(bill_entry)
            
            # Create account entry
            account_entry = {
                "account_name": account_name,
                "account_number": None,
                "amount": None,
                "total_amount": account_amount
            }
            entries.append(account_entry)
        
        return entries
    
    def _parse_single_packed_entry(self, words: List[str]) -> List[Dict[str, Any]]:
        """
        Parse a single packed entry using greedy approach.
        """
        entries = []
        i = 0
        
        while i < len(words):
            entry_found = False
            
            # Try progressively longer combinations, prioritizing Type 3 patterns
            for length in range(4, min(len(words) - i + 1, 10)):  # Start with longer patterns
                candidate = ' '.join(words[i:i + length])
                entry = self._parse_single_entry(candidate)
                if entry:
                    entries.append(entry)
                    i += length
                    entry_found = True
                    break
            
            # If no long pattern worked, try shorter ones
            if not entry_found:
                for length in range(2, 4):
                    if i + length <= len(words):
                        candidate = ' '.join(words[i:i + length])
                        entry = self._parse_single_entry(candidate)
                        if entry:
                            entries.append(entry)
                            i += length
                            entry_found = True
                            break
            
            if not entry_found:
                i += 1
        
        return entries
    
    def _is_person_name(self, name: str) -> bool:
        """
        Determine if the given text represents a person name.
        Updated to work with the new business terms checker.
        """
        # Simple heuristic: person names typically have 2-3 words and don't contain business terms
        words = name.split()
        
        if len(words) < 2 or len(words) > 3:
            return False
        
        return not self._contains_business_terms(name)
    
    def _convert_amount_to_words(self, amount: float) -> str:
        """
        Convert numeric amount to words in Indian format (lakhs, crores).
        """
        if amount == 0:
            return "Zero rupees only"
        
        # Split into rupees and paise
        rupees = int(amount)
        paise = round((amount - rupees) * 100)
        
        # Convert rupees to words
        rupees_words = self._number_to_words_indian(rupees)
        
        # Build the final string
        result = ""
        if rupees > 0:
            result += f"{rupees_words} rupee"
            if rupees != 1:
                result += "s"
        
        if paise > 0:
            if rupees > 0:
                result += " and "
            paise_words = self._number_to_words_indian(paise)
            result += f"{paise_words} paise"
        
        result += " only"
        return result
    
    def _number_to_words_indian(self, num: int) -> str:
        """
        Convert number to words using Indian numbering system (lakhs, crores).
        """
        if num == 0:
            return "zero"
        
        # Basic numbers
        ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
                "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", 
                "seventeen", "eighteen", "nineteen"]
        
        tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
        
        def convert_hundreds(n):
            """Convert number less than 1000 to words"""
            result = ""
            
            if n >= 100:
                result += ones[n // 100] + " hundred"
                n %= 100
                if n > 0:
                    result += " "
            
            if n >= 20:
                result += tens[n // 10]
                n %= 10
                if n > 0:
                    result += "-" + ones[n]
            elif n > 0:
                result += ones[n]
            
            return result
        
        def convert_group(n):
            """Convert number less than 100 to words (for lakhs, crores)"""
            if n == 0:
                return ""
            elif n < 20:
                return ones[n]
            else:
                result = tens[n // 10]
                if n % 10 > 0:
                    result += "-" + ones[n % 10]
                return result
        
        result = ""
        
        # Handle crores (10,000,000)
        if num >= 10000000:
            crores = num // 10000000
            result += convert_group(crores) + " crore"
            num %= 10000000
            if num > 0:
                result += " "
        
        # Handle lakhs (100,000)
        if num >= 100000:
            lakhs = num // 100000
            result += convert_group(lakhs) + " lakh"
            num %= 100000
            if num > 0:
                result += " "
        
        # Handle thousands (1,000)
        if num >= 1000:
            thousands = num // 1000
            result += convert_group(thousands) + " thousand"
            num %= 1000
            if num > 0:
                result += " "
        
        # Handle hundreds, tens, and ones
        if num > 0:
            result += convert_hundreds(num)
        
        return result.strip()
    
    def save_parsed_data(self, parsed_data: List[Dict[str, Any]], output_path: str) -> str:
        """
        Save parsed data to JSON file.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(parsed_data, f, indent=2, ensure_ascii=False)
        
        return output_path

    def _find_type3_patterns(self, words: List[str]) -> List[Tuple[int, int, str]]:
        """
        Find Type 3 patterns (Name S/O Name + account_number + amount) in a list of words.
        Returns list of tuples: (start_index, end_index, matched_text)
        """
        matches = []
        i = 0
        
        while i < len(words):
            # Look for pattern: NAME (S/O|W/O) NAME ACCOUNT_NUMBER AMOUNT
            if i + 4 < len(words):
                # Check if this could be a person name pattern
                potential_name = []
                j = i
                
                # Collect name words until we find S/O or W/O
                while j < len(words) and words[j] not in ['S/O', 'W/O']:
                    # Names are typically all caps
                    if words[j].isupper() and words[j].isalpha():
                        potential_name.append(words[j])
                        j += 1
                    else:
                        break
                
                # Check if we found S/O or W/O
                if j < len(words) and words[j] in ['S/O', 'W/O']:
                    relation = words[j]
                    j += 1
                    
                    # Collect father/husband name
                    father_name = []
                    while j < len(words) and words[j].isupper() and words[j].isalpha():
                        father_name.append(words[j])
                        j += 1
                    
                    # Check for account number and amount
                    if (j + 1 < len(words) and 
                        re.match(r'^\d{1,4}$', words[j]) and 
                        re.match(r'^\d+\.?\d*$', words[j + 1])):
                        
                        # Found a complete Type 3 pattern
                        end_idx = j + 1
                        matched_text = ' '.join(words[i:end_idx + 1])
                        matches.append((i, end_idx, matched_text))
                        i = end_idx + 1
                        continue
            
            i += 1
        
        return matches

    def _parse_business_entries(self, words: List[str]) -> List[Dict[str, Any]]:
        """
        Parse business account entries by identifying business terms and amounts.
        Looks for patterns with business keywords like LOAN, ACCOUNT, BALANCE, etc.
        """
        entries = []
        
        # Business keywords that typically indicate business accounts
        business_keywords = [
            'LOAN', 'ACCOUNT', 'A/C', 'BALANCE', 'EXPENCES', 'PURCHASE', 
            'SOCIETY', 'INTEREST', 'MEMBER', 'OPENING', 'CLOSING', 'STOCK',
            'CAPITAL', 'PROFIT', 'LOSS', 'SALES', 'CASH', 'BANK'
        ]
        
        # Try to find business patterns with amounts
        i = 0
        while i < len(words):
            # Look for business keyword followed by amount within next few words
            for j in range(i, min(i + 6, len(words))):
                if any(keyword in words[j].upper() for keyword in business_keywords):
                    # Found a business keyword, look for amount in next few words
                    for k in range(j + 1, min(j + 4, len(words))):
                        if re.match(r'^\d+\.?\d*$', words[k]):
                            # Found business term with amount
                            business_text = ' '.join(words[i:k + 1])
                            entry = self._parse_single_entry(business_text)
                            if entry:
                                entries.append(entry)
                            i = k + 1
                            break
                    else:
                        continue
                    break
            else:
                i += 1
        
        return entries

    def generate_parsing_report(self) -> Dict[str, Any]:
        """
        Generate a comprehensive parsing report.
        
        Returns:
            Dictionary containing detailed parsing statistics and analysis
        """
        total_lines = self.stats['total_lines_processed']
        processed_lines = self.stats['lines_parsed_successfully'] + self.stats['lines_ignored']
        
        report = {
            "parsing_summary": {
                "total_lines_processed": total_lines,
                "lines_parsed_successfully": self.stats['lines_parsed_successfully'],
                "lines_ignored": self.stats['lines_ignored'],
                "parsing_errors": self.stats['parsing_errors'],
                "tables_found": self.stats['tables_found'],
                "entries_extracted": self.stats['entries_extracted']
            },
            "success_rates": {
                "line_processing_rate": f"{(processed_lines/total_lines)*100:.1f}%" if total_lines > 0 else "0%",
                "entry_extraction_rate": f"{(self.stats['lines_parsed_successfully']/total_lines)*100:.1f}%" if total_lines > 0 else "0%",
                "ignore_rate": f"{(self.stats['lines_ignored']/total_lines)*100:.1f}%" if total_lines > 0 else "0%"
            },
            "recommendations": []
        }
        
        # Add recommendations based on statistics
        if self.stats['lines_ignored'] > (total_lines * 0.3):  # More than 30% ignored
            report["recommendations"].append(
                "High number of ignored lines detected. Consider reviewing the input format or enhancing regex patterns."
            )
        
        if self.stats['parsing_errors'] > 0:
            report["recommendations"].append(
                f"{self.stats['parsing_errors']} parsing errors occurred. Check the error logs for details."
            )
        
        if self.stats['tables_found'] == 0:
            report["recommendations"].append(
                "No daybook tables found. Verify that the input follows the expected 'Daybook DD-MM-YYYY' format."
            )
        
        return report
    
    def save_parsing_report(self, report_path: str = None) -> str:
        """
        Save the parsing report to a JSON file.
        
        Args:
            report_path: Path to save the report. If None, creates timestamped file in data/logs/
            
        Returns:
            Path to the saved report file
        """
        if report_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_dir = Path("data/logs")
            log_dir.mkdir(exist_ok=True)
            report_path = log_dir / f"parsing_report_{timestamp}.json"
        
        report = self.generate_parsing_report()
        report["generated_at"] = datetime.now().isoformat()
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        if self.logger:
            self.logger.info(f"📊 Parsing report saved to: {report_path}")
        
        return str(report_path)

def parse_daybook(input_file: str, output_file: str = None) -> List[Dict[str, Any]]:
    """
    Main function to parse daybook text file.
    """
    parser = DaybookParser()
    parsed_data = parser.parse_text_file(input_file)
    
    if output_file:
        parser.save_parsed_data(parsed_data, output_file)
    
    return parsed_data