"""
Bills Scraper for Open Civic Data
Scrapes information about legislation, bills, and voting records
Based on: https://open-civic-data.readthedocs.io/en/latest/scrape/bills.html
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
import re

logger = logging.getLogger(__name__)

class BillsScraper:
    """Scraper for legislation and bills"""
    
    def __init__(self, state_abbr: str):
        self.state_abbr = state_abbr
        self.base_urls = {
            'congress': 'https://www.congress.gov',
            'house': 'https://www.house.gov',
            'senate': 'https://www.senate.gov'
        }
    
    def scrape_federal_bills(self, official: Dict, limit: int = 10) -> List[Dict]:
        """
        Scrape federal bills related to an official
        """
        bills = []
        
        try:
            # This would scrape actual Congress.gov data
            # For now, return sample data
            sample_bills = [
                {
                    'id': 'hr-1234',
                    'title': 'Infrastructure Investment and Jobs Act',
                    'number': 'H.R. 1234',
                    'status': 'Passed House',
                    'introduced_date': datetime.now() - timedelta(days=30),
                    'last_action': 'Passed House by voice vote',
                    'last_action_date': datetime.now() - timedelta(days=5),
                    'sponsor': official.get('name', ''),
                    'sponsor_party': official.get('party', ''),
                    'summary': 'A bill to invest in infrastructure, create jobs, and strengthen the economy.',
                    'url': 'https://www.congress.gov/bill/117th-congress/house-bill/1234',
                    'level': 'Federal',
                    'committee': 'Transportation and Infrastructure',
                    'cosponsors': 45,
                    'subjects': ['Infrastructure', 'Transportation', 'Jobs'],
                    'voting_record': {
                        'yea': 220,
                        'nay': 210,
                        'not_voting': 5
                    }
                },
                {
                    'id': 'hr-5678',
                    'title': 'Clean Energy for America Act',
                    'number': 'H.R. 5678',
                    'status': 'In Committee',
                    'introduced_date': datetime.now() - timedelta(days=45),
                    'last_action': 'Referred to House Committee on Energy and Commerce',
                    'last_action_date': datetime.now() - timedelta(days=40),
                    'sponsor': official.get('name', ''),
                    'sponsor_party': official.get('party', ''),
                    'summary': 'A bill to promote clean energy and reduce carbon emissions.',
                    'url': 'https://www.congress.gov/bill/117th-congress/house-bill/5678',
                    'level': 'Federal',
                    'committee': 'Energy and Commerce',
                    'cosponsors': 32,
                    'subjects': ['Energy', 'Environment', 'Climate'],
                    'voting_record': None
                }
            ]
            
            bills.extend(sample_bills[:limit])
            
        except Exception as e:
            logger.error(f"Error scraping federal bills for {official.get('name')}: {e}")
        
        return bills
    
    def scrape_state_bills(self, official: Dict, limit: int = 10) -> List[Dict]:
        """
        Scrape state bills related to an official
        """
        bills = []
        
        try:
            # This would scrape actual state legislature data
            # For now, return sample data
            sample_bills = [
                {
                    'id': f'state-{self.state_abbr}-123',
                    'title': f'{self.state_abbr} Education Reform Act',
                    'number': f'HB 123',
                    'status': 'Passed Senate',
                    'introduced_date': datetime.now() - timedelta(days=60),
                    'last_action': 'Passed Senate by 25-15 vote',
                    'last_action_date': datetime.now() - timedelta(days=10),
                    'sponsor': official.get('name', ''),
                    'sponsor_party': official.get('party', ''),
                    'summary': f'A bill to reform education funding in {self.state_abbr}.',
                    'url': f'https://{self.state_abbr.lower()}.gov/legislature/bills/hb123',
                    'level': 'State',
                    'committee': 'Education',
                    'cosponsors': 8,
                    'subjects': ['Education', 'Funding', 'Reform'],
                    'voting_record': {
                        'yea': 25,
                        'nay': 15,
                        'not_voting': 0
                    }
                },
                {
                    'id': f'state-{self.state_abbr}-456',
                    'title': f'{self.state_abbr} Healthcare Access Bill',
                    'number': f'SB 456',
                    'status': 'In Committee',
                    'introduced_date': datetime.now() - timedelta(days=30),
                    'last_action': 'Referred to Senate Health Committee',
                    'last_action_date': datetime.now() - timedelta(days=25),
                    'sponsor': official.get('name', ''),
                    'sponsor_party': official.get('party', ''),
                    'summary': f'A bill to expand healthcare access in {self.state_abbr}.',
                    'url': f'https://{self.state_abbr.lower()}.gov/legislature/bills/sb456',
                    'level': 'State',
                    'committee': 'Health',
                    'cosponsors': 12,
                    'subjects': ['Healthcare', 'Access', 'Insurance'],
                    'voting_record': None
                }
            ]
            
            bills.extend(sample_bills[:limit])
            
        except Exception as e:
            logger.error(f"Error scraping state bills for {official.get('name')}: {e}")
        
        return bills
    
    def get_recent_votes(self, official: Dict, limit: int = 10) -> List[Dict]:
        """
        Get recent voting record for an official
        """
        votes = []
        
        try:
            # This would scrape actual voting records
            # For now, return sample data
            sample_votes = [
                {
                    'id': 'vote-1',
                    'bill_title': 'Infrastructure Investment Act',
                    'bill_number': 'H.R. 1234',
                    'vote': 'Yea',
                    'vote_date': datetime.now() - timedelta(days=5),
                    'result': 'Passed',
                    'description': 'Vote on final passage of infrastructure bill',
                    'url': 'https://www.congress.gov/vote/117th-congress/house/2024/001',
                    'level': official.get('level', ''),
                    'committee': 'Transportation and Infrastructure'
                },
                {
                    'id': 'vote-2',
                    'bill_title': 'Clean Energy Tax Credits',
                    'bill_number': 'H.R. 5678',
                    'vote': 'Nay',
                    'vote_date': datetime.now() - timedelta(days=10),
                    'result': 'Failed',
                    'description': 'Vote on clean energy tax credit amendments',
                    'url': 'https://www.congress.gov/vote/117th-congress/house/2024/002',
                    'level': official.get('level', ''),
                    'committee': 'Ways and Means'
                }
            ]
            
            votes.extend(sample_votes[:limit])
            
        except Exception as e:
            logger.error(f"Error getting votes for {official.get('name')}: {e}")
        
        return votes
    
    def get_bill_details(self, bill_id: str) -> Optional[Dict]:
        """
        Get detailed information about a specific bill
        """
        try:
            # This would scrape detailed bill information
            # For now, return sample data
            sample_bill = {
                'id': bill_id,
                'title': 'Sample Bill Title',
                'number': 'H.R. 1234',
                'status': 'Passed House',
                'introduced_date': datetime.now() - timedelta(days=30),
                'last_action': 'Passed House by voice vote',
                'last_action_date': datetime.now() - timedelta(days=5),
                'sponsor': 'Rep. John Smith',
                'sponsor_party': 'Democratic',
                'summary': 'A comprehensive bill to address infrastructure needs.',
                'full_text_url': 'https://www.congress.gov/bill/117th-congress/house-bill/1234/text',
                'committee_reports': [
                    'House Report 117-123',
                    'Senate Report 117-456'
                ],
                'amendments': [
                    'Amendment 1: Increased funding for rural areas',
                    'Amendment 2: Added environmental protections'
                ],
                'cosponsors': [
                    {'name': 'Rep. Jane Doe', 'party': 'Republican', 'date': datetime.now() - timedelta(days=25)},
                    {'name': 'Rep. Bob Johnson', 'party': 'Democratic', 'date': datetime.now() - timedelta(days=20)}
                ],
                'subjects': ['Infrastructure', 'Transportation', 'Jobs', 'Environment'],
                'voting_record': {
                    'house': {'yea': 220, 'nay': 210, 'not_voting': 5},
                    'senate': None
                },
                'timeline': [
                    {'date': datetime.now() - timedelta(days=30), 'action': 'Introduced in House'},
                    {'date': datetime.now() - timedelta(days=25), 'action': 'Referred to Committee'},
                    {'date': datetime.now() - timedelta(days=20), 'action': 'Committee hearing held'},
                    {'date': datetime.now() - timedelta(days=15), 'action': 'Committee markup completed'},
                    {'date': datetime.now() - timedelta(days=10), 'action': 'Reported to House floor'},
                    {'date': datetime.now() - timedelta(days=5), 'action': 'Passed House'}
                ]
            }
            
            return sample_bill
            
        except Exception as e:
            logger.error(f"Error getting bill details for {bill_id}: {e}")
            return None
    
    def search_bills(self, query: str, level: str = 'Federal', limit: int = 20) -> List[Dict]:
        """
        Search for bills by keyword
        """
        bills = []
        
        try:
            # This would perform actual bill searches
            # For now, return sample data
            sample_bills = [
                {
                    'id': f'search-{query.lower().replace(" ", "-")}-1',
                    'title': f'Bill related to {query}',
                    'number': 'H.R. 9999',
                    'status': 'Introduced',
                    'introduced_date': datetime.now() - timedelta(days=15),
                    'last_action': 'Introduced in House',
                    'last_action_date': datetime.now() - timedelta(days=15),
                    'sponsor': 'Rep. Sample',
                    'sponsor_party': 'Democratic',
                    'summary': f'A bill to address issues related to {query}.',
                    'url': 'https://www.congress.gov/bill/117th-congress/house-bill/9999',
                    'level': level,
                    'committee': 'Various',
                    'cosponsors': 0,
                    'subjects': [query.title()],
                    'voting_record': None
                }
            ]
            
            bills.extend(sample_bills[:limit])
            
        except Exception as e:
            logger.error(f"Error searching bills for '{query}': {e}")
        
        return bills

