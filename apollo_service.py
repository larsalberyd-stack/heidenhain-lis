#!/usr/bin/env python3
"""
Apollo.io API Service for Heidenhain Lead Intelligence
Fetches decision-maker contact information for companies
"""

import requests
import json
from typing import List, Dict, Optional

API_KEY = "2VIzVKGfFtu_Mz10xxM9nA"
BASE_URL = "https://api.apollo.io/api/v1"

HEADERS = {
    "Content-Type": "application/json",
    "X-Api-Key": API_KEY
}

def search_people(company_name: str, titles: List[str] = None, limit: int = 10) -> List[Dict]:
    """
    Search for people at a company with specific titles
    
    Args:
        company_name: Name of the company to search
        titles: List of job titles to filter (e.g., ["CTO", "VP Engineering"])
        limit: Maximum number of results
    
    Returns:
        List of person dictionaries with basic info
    """
    payload = {
        "api_key": API_KEY,
        "q_organization_name": company_name,
        "page": 1,
        "per_page": limit
    }
    
    if titles:
        payload["person_titles"] = titles
    
    try:
        response = requests.post(
            f"{BASE_URL}/mixed_people/api_search",
            headers=HEADERS,
            json=payload,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get('people', [])
        else:
            print(f"Search error: {response.status_code}")
            return []
            
    except Exception as e:
        print(f"Search exception: {str(e)}")
        return []


def enrich_person(first_name: str, last_name: str, company_name: str) -> Optional[Dict]:
    """
    Enrich a person's data to get email, phone, LinkedIn
    
    Args:
        first_name: Person's first name
        last_name: Person's last name
        company_name: Company name
    
    Returns:
        Dictionary with enriched contact data or None
    """
    payload = {
        "api_key": API_KEY,
        "first_name": first_name,
        "last_name": last_name,
        "organization_name": company_name
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/people/match",
            headers=HEADERS,
            json=payload,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get('person')
        else:
            return None
            
    except Exception as e:
        print(f"Enrichment exception: {str(e)}")
        return None


def get_decision_makers(company_name: str) -> List[Dict]:
    """
    Get decision makers for a company with full contact details
    
    Args:
        company_name: Name of the company
    
    Returns:
        List of decision makers with email, phone, LinkedIn
    """
    # Define key decision-maker titles
    titles = [
        "CTO", "Chief Technology Officer",
        "VP Engineering", "VP Product", "VP Operations",
        "Director Engineering", "Director Product",
        "Head of Engineering", "Head of Product", "Head of R&D",
        "CEO", "Chief Executive Officer",
        "Procurement Manager", "Purchasing Manager"
    ]
    
    # Search for people
    people = search_people(company_name, titles, limit=15)
    
    decision_makers = []
    
    for person in people:
        # Get title to search for this role
        title = person.get('title', '')
        if not title:
            continue
        
        # For now, we'll need to manually search or use a different approach
        # The search API doesn't give us names, so we can't enrich
        # We need to use a different strategy
        
        # Add placeholder for now - will be enriched later
        decision_maker = {
            "name": f"Search: {title}",
            "title": title,
            "email": None,
            "phone": None,
            "linkedin": None,
            "role": categorize_role(title),
            "priority": determine_priority(title)
        }
        
        decision_makers.append(decision_maker)
        continue
        
        # Original enrichment code (commented out for now)
        name = person.get('name', '')
        if not name or name == 'N/A':
            continue
            
        name_parts = name.split()
        if len(name_parts) < 2:
            continue
            
        first_name = name_parts[0]
        last_name = ' '.join(name_parts[1:])
        
        # Enrich to get contact details
        enriched = enrich_person(first_name, last_name, company_name)
        
        if enriched:
            decision_maker = {
                "name": enriched.get('name', name),
                "title": enriched.get('title', person.get('title', '')),
                "email": enriched.get('email'),
                "phone": None,
                "linkedin": enriched.get('linkedin_url'),
                "role": categorize_role(enriched.get('title', '')),
                "priority": determine_priority(enriched.get('title', ''))
            }
            
            # Get phone if available
            if enriched.get('phone_numbers'):
                decision_maker["phone"] = enriched['phone_numbers'][0].get('sanitized_number')
            
            decision_makers.append(decision_maker)
    
    return decision_makers


def categorize_role(title: str) -> str:
    """Categorize a job title into a role type"""
    title_lower = title.lower()
    
    if any(word in title_lower for word in ['ceo', 'chief executive', 'president']):
        return "Executive"
    elif any(word in title_lower for word in ['cto', 'chief technology', 'vp', 'vice president', 'director', 'head of']):
        return "Technical"
    elif any(word in title_lower for word in ['procurement', 'purchasing', 'buyer', 'supply chain']):
        return "Buyer"
    else:
        return "Other"


def determine_priority(title: str) -> str:
    """Determine priority level based on title"""
    title_lower = title.lower()
    
    if any(word in title_lower for word in ['ceo', 'cto', 'chief', 'president']):
        return "high"
    elif any(word in title_lower for word in ['vp', 'vice president', 'director', 'head of']):
        return "high"
    else:
        return "medium"


if __name__ == "__main__":
    # Test the service
    print("Testing Apollo Service...\n")
    
    company = "Kongsberg Maritime"
    print(f"Fetching decision makers for {company}...\n")
    
    decision_makers = get_decision_makers(company)
    
    print(f"Found {len(decision_makers)} decision makers:\n")
    
    for i, dm in enumerate(decision_makers[:5], 1):
        print(f"{i}. {dm['name']}")
        print(f"   Title: {dm['title']}")
        print(f"   Email: {dm['email']}")
        print(f"   Phone: {dm['phone']}")
        print(f"   LinkedIn: {dm['linkedin']}")
        print(f"   Role: {dm['role']} | Priority: {dm['priority']}")
        print()
