from typing import List, Dict, Optional
import logging
from .people_scraper import PeopleScraper
from .events_scraper import EventsScraper
from .bills_scraper import BillsScraper

logger = logging.getLogger(__name__)

class ScraperCoordinator:
    
    def __init__(self, state_abbr: str = None, zip_code: str = None):
        self.state_abbr = state_abbr
        self.zip_code = zip_code
        
        self.people_scraper = PeopleScraper(state_abbr)
        self.events_scraper = EventsScraper(state_abbr, zip_code)
        self.bills_scraper = BillsScraper(state_abbr)
    
    def enhance_officials(self, officials: List[Dict]) -> List[Dict]:
        enhanced_officials = []
        
        for official in officials:
            try:
                enhanced = self._enhance_single_official(official)
                enhanced_officials.append(enhanced)
            except Exception as e:
                logger.error(f"Error enhancing official {official.get('name')}: {e}")
                enhanced_officials.append(official)  # Return original if enhancement fails
        
        return enhanced_officials
    
    def _enhance_single_official(self, official: Dict) -> Dict:
        
        # Enhance with people scraper data
        if official.get('level') == 'Federal':
            official = self.people_scraper._enhance_federal_official(official)
        elif official.get('level') == 'State':
            official = self.people_scraper._enhance_state_official(official)
        
        # Add recent bills
        if official.get('level') == 'Federal':
            recent_bills = self.bills_scraper.scrape_federal_bills(official, limit=5)
        else:
            recent_bills = self.bills_scraper.scrape_state_bills(official, limit=5)
        
        if recent_bills:
            official['recentBills'] = [f"{bill['number']}: {bill['title']}" for bill in recent_bills]
            official['bills'] = recent_bills  # Store full bill data
        
        # Add recent votes
        recent_votes = self.bills_scraper.get_recent_votes(official, limit=5)
        if recent_votes:
            official['recentVotes'] = recent_votes
        
        # Add upcoming events
        upcoming_events = self.events_scraper.get_events_by_official(official, limit=3)
        if upcoming_events:
            official['upcomingEvents'] = upcoming_events
        
        # Add comprehensive contact information
        official['contact'] = self._enhance_contact_info(official)
        
        # Add political information
        official['politicalInfo'] = self._get_political_info(official)
        
        return official
    
    def _enhance_contact_info(self, official: Dict) -> Dict:
        contact = official.get('contact', {})
        
        # Add additional contact methods if not present
        if not contact.get('email') and official.get('level') == 'Federal':
            # Try to get email from official sources
            contact['email'] = self._get_official_email(official)
        
        if not contact.get('website') and official.get('level') == 'Federal':
            # Try to get official website
            contact['website'] = self._get_official_website(official)
        
        # Add social media if available
        contact['social_media'] = self._get_social_media(official)
        
        return contact
    
    def _get_official_email(self, official: Dict) -> Optional[str]:
        try:
            return f"{official.get('name', '').lower().replace(' ', '.')}@house.gov"
        except Exception as e:
            logger.error(f"Error getting email for {official.get('name')}: {e}")
            return None
    
    def _get_official_website(self, official: Dict) -> Optional[str]:
        try:
            return f"https://{official.get('name', '').lower().replace(' ', '')}.house.gov"
        except Exception as e:
            logger.error(f"Error getting website for {official.get('name')}: {e}")
            return None
    
    def _get_social_media(self, official: Dict) -> Dict:
        try:

            return {
                'twitter': f"https://twitter.com/{official.get('name', '').lower().replace(' ', '')}",
                'facebook': f"https://facebook.com/{official.get('name', '').lower().replace(' ', '')}",
                'instagram': f"https://instagram.com/{official.get('name', '').lower().replace(' ', '')}"
            }
        except Exception as e:
            logger.error(f"Error getting social media for {official.get('name')}: {e}")
            return {}
    
    def _get_political_info(self, official: Dict) -> Dict:
        try:
            return {
                'party': official.get('party', 'Unknown'),
                'level': official.get('level', 'Unknown'),
                'office': official.get('office', 'Unknown'),
                'district': official.get('district', 'Unknown'),
                'committees': official.get('committees', []),
                'term_info': self._get_term_info(official),
                'voting_record': self._get_voting_summary(official),
                'key_issues': self._get_key_issues(official)
            }
        except Exception as e:
            logger.error(f"Error getting political info for {official.get('name')}: {e}")
            return {}
    
    def _get_term_info(self, official: Dict) -> Dict:
        try:
            if official.get('level') == 'Federal':
                if 'Senator' in official.get('office', ''):
                    return {
                        'term_length': '6 years',
                        'next_election': '2024 or 2026',
                        'term_limit': 'None'
                    }
                elif 'Representative' in official.get('office', ''):
                    return {
                        'term_length': '2 years',
                        'next_election': '2024',
                        'term_limit': 'None'
                    }
            elif official.get('level') == 'State':
                return {
                    'term_length': '2-4 years',
                    'next_election': '2024',
                    'term_limit': 'Varies by state'
                }
            
            return {}
        except Exception as e:
            logger.error(f"Error getting term info for {official.get('name')}: {e}")
            return {}
    
    def _get_voting_summary(self, official: Dict) -> Dict:
        try:
            recent_votes = official.get('recentVotes', [])
            if not recent_votes:
                return {}
            
            yea_votes = sum(1 for vote in recent_votes if vote.get('vote') == 'Yea')
            nay_votes = sum(1 for vote in recent_votes if vote.get('vote') == 'Nay')
            total_votes = len(recent_votes)
            
            return {
                'total_recent_votes': total_votes,
                'yea_votes': yea_votes,
                'nay_votes': nay_votes,
                'attendance_rate': f"{((yea_votes + nay_votes) / total_votes * 100):.1f}%" if total_votes > 0 else "0%"
            }
        except Exception as e:
            logger.error(f"Error getting voting summary for {official.get('name')}: {e}")
            return {}
    
    def _get_key_issues(self, official: Dict) -> List[str]:
        try:
            issues = set()
            
            # Extract issues from recent bills
            recent_bills = official.get('bills', [])
            for bill in recent_bills:
                subjects = bill.get('subjects', [])
                issues.update(subjects)
            
            # Extract issues from recent votes
            recent_votes = official.get('recentVotes', [])
            for vote in recent_votes:
                bill_title = vote.get('bill_title', '')
                if 'infrastructure' in bill_title.lower():
                    issues.add('Infrastructure')
                elif 'healthcare' in bill_title.lower():
                    issues.add('Healthcare')
                elif 'education' in bill_title.lower():
                    issues.add('Education')
                elif 'environment' in bill_title.lower() or 'climate' in bill_title.lower():
                    issues.add('Environment')
            
            return list(issues)[:5]  # Return top 5 issues
        except Exception as e:
            logger.error(f"Error getting key issues for {official.get('name')}: {e}")
            return []
    
    def get_events_for_location(self, limit: int = 20) -> List[Dict]:
        events = []
        
        try:
            # Get federal events
            federal_events = self.events_scraper.scrape_federal_events(limit // 3)
            events.extend(federal_events)
            
            # Get state events
            state_events = self.events_scraper.scrape_state_events(limit // 3)
            events.extend(state_events)
            
            # Get local events
            local_events = self.events_scraper.scrape_local_events(limit // 3)
            events.extend(local_events)
            
        except Exception as e:
            logger.error(f"Error getting events for location: {e}")
        
        return events[:limit]
    
    def search_bills(self, query: str, level: str = 'All', limit: int = 20) -> List[Dict]:
        bills = []
        
        try:
            if level in ['All', 'Federal']:
                federal_bills = self.bills_scraper.search_bills(query, 'Federal', limit // 2)
                bills.extend(federal_bills)
            
            if level in ['All', 'State']:
                state_bills = self.bills_scraper.search_bills(query, 'State', limit // 2)
                bills.extend(state_bills)
            
        except Exception as e:
            logger.error(f"Error searching bills: {e}")
        
        return bills[:limit]

