#!/usr/bin/env python3
"""
Free Data Enrichment Service for Heidenhain Lead Intelligence
Uses web scraping, LinkedIn search, and email guessing to enrich company data
"""

import requests
import json
import re
from typing import List, Dict, Optional
from urllib.parse import quote

def search_linkedin_profiles(company_name: str, title: str) -> List[str]:
    """
    Search for LinkedIn profiles using Google
    
    Args:
        company_name: Company name
        title: Job title to search for
    
    Returns:
        List of LinkedIn profile URLs
    """
    # Use Google to search LinkedIn
    query = f'site:linkedin.com/in {title} {company_name}'
    
    # Note: This is a simplified version. In production, you'd use:
    # - Selenium for actual Google scraping
    # - Or SerpAPI for Google results
    # For now, return empty list as placeholder
    
    return []


def guess_email(first_name: str, last_name: str, domain: str) -> List[str]:
    """
    Generate possible email addresses based on common patterns
    
    Args:
        first_name: Person's first name
        last_name: Person's last name
        domain: Company domain (e.g., "kongsberg.com")
    
    Returns:
        List of possible email addresses, ordered by likelihood
    """
    first = first_name.lower().strip()
    last = last_name.lower().strip()
    
    # Remove special characters
    first = re.sub(r'[^a-z]', '', first)
    last = re.sub(r'[^a-z]', '', last)
    
    if not first or not last or not domain:
        return []
    
    # Common email patterns, ordered by popularity
    patterns = [
        f"{first}.{last}@{domain}",           # john.doe@company.com (most common)
        f"{first}{last}@{domain}",             # johndoe@company.com
        f"{first[0]}{last}@{domain}",          # jdoe@company.com
        f"{first}_{last}@{domain}",            # john_doe@company.com
        f"{first}.{last[0]}@{domain}",         # john.d@company.com
        f"{last}.{first}@{domain}",            # doe.john@company.com
        f"{first}@{domain}",                   # john@company.com
        f"{first[0]}.{last}@{domain}",         # j.doe@company.com
    ]
    
    return patterns


def get_company_domain(company_name: str) -> Optional[str]:
    """
    Guess company domain from company name
    
    Args:
        company_name: Company name
    
    Returns:
        Likely domain or None
    """
    # Simple mapping for known companies
    domain_map = {
        "kongsberg maritime": "kongsberg.com",
        "kongsberg": "kongsberg.com",
        "abb marine": "abb.com",
        "abb": "abb.com",
        "danfoss editron": "danfoss.com",
        "danfoss": "danfoss.com",
        "humphree": "humphree.com",
        "sleipner motor": "sleipner.no",
        "sleipner": "sleipner.no",
        "candela": "candela.com",
        "brunvoll": "brunvoll.no",
    }
    
    company_lower = company_name.lower().strip()
    
    if company_lower in domain_map:
        return domain_map[company_lower]
    
    # Try to guess from company name
    # Remove common suffixes
    clean_name = re.sub(r'\s+(ab|as|asa|ltd|limited|inc|corporation|corp|gmbh|maritime|marine)$', '', company_lower, flags=re.IGNORECASE)
    clean_name = re.sub(r'[^a-z]', '', clean_name)
    
    if clean_name:
        return f"{clean_name}.com"
    
    return None


def generate_decision_makers(company_name: str, industry: str = "marine") -> List[Dict]:
    """
    Generate decision maker profiles for a company
    
    Args:
        company_name: Company name
        industry: Industry sector
    
    Returns:
        List of decision maker dictionaries
    """
    # Define typical decision-maker roles for marine industry
    roles = [
        {
            "title": "Chief Technology Officer",
            "short_title": "CTO",
            "role": "Technical",
            "priority": "high",
            "typical_names": ["CTO", "Chief Technology Officer"]
        },
        {
            "title": "VP Engineering",
            "short_title": "VP Engineering",
            "role": "Technical",
            "priority": "high",
            "typical_names": ["VP Engineering", "Vice President Engineering"]
        },
        {
            "title": "Head of R&D",
            "short_title": "Head of R&D",
            "role": "Technical",
            "priority": "high",
            "typical_names": ["Head of R&D", "R&D Director"]
        },
        {
            "title": "Procurement Manager",
            "short_title": "Procurement Manager",
            "role": "Buyer",
            "priority": "high",
            "typical_names": ["Procurement Manager", "Purchasing Manager"]
        },
        {
            "title": "Product Manager",
            "short_title": "Product Manager",
            "role": "Technical",
            "priority": "medium",
            "typical_names": ["Product Manager", "Head of Product"]
        },
    ]
    
    decision_makers = []
    domain = get_company_domain(company_name)
    
    for role_info in roles:
        decision_maker = {
            "name": f"Sök: {role_info['title']}",  # Placeholder - to be filled manually or via LinkedIn
            "title": role_info['title'],
            "role": role_info['role'],
            "priority": role_info['priority'],
            "email": None,  # Will be filled when name is known
            "phone": None,  # To be filled manually
            "linkedin": None,  # To be filled when found
            "email_patterns": []  # Possible email patterns
        }
        
        # If we have a domain, add email patterns for reference
        if domain:
            # These are templates that can be used once we know the person's name
            decision_maker["email_patterns"] = [
                f"förnamn.efternamn@{domain}",
                f"förnamnefternamn@{domain}",
                f"f.efternamn@{domain}"
            ]
        
        decision_makers.append(decision_maker)
    
    return decision_makers


def enrich_decision_maker(decision_maker: Dict, first_name: str, last_name: str, company_name: str) -> Dict:
    """
    Enrich a decision maker profile with name and guessed email
    
    Args:
        decision_maker: Existing decision maker dict
        first_name: Person's first name
        last_name: Person's last name
        company_name: Company name
    
    Returns:
        Enriched decision maker dict
    """
    domain = get_company_domain(company_name)
    
    decision_maker["name"] = f"{first_name} {last_name}"
    
    if domain:
        emails = guess_email(first_name, last_name, domain)
        if emails:
            decision_maker["email"] = emails[0]  # Use most likely pattern
            decision_maker["email_alternatives"] = emails[1:3]  # Store alternatives
    
    # Generate LinkedIn search URL
    linkedin_search = f"https://www.linkedin.com/search/results/people/?keywords={quote(first_name + ' ' + last_name + ' ' + company_name)}"
    decision_maker["linkedin_search"] = linkedin_search
    
    return decision_maker


if __name__ == "__main__":
    # Test the service
    print("Testing Free Enrichment Service...\n")
    
    company = "Kongsberg Maritime"
    print(f"Generating decision makers for {company}...\n")
    
    decision_makers = generate_decision_makers(company)
    
    print(f"Generated {len(decision_makers)} decision maker roles:\n")
    
    for i, dm in enumerate(decision_makers, 1):
        print(f"{i}. {dm['title']}")
        print(f"   Role: {dm['role']} | Priority: {dm['priority']}")
        print(f"   Email patterns: {', '.join(dm.get('email_patterns', []))}")
        print()
    
    # Test enrichment
    print("\nTesting enrichment for Geir Håøy...")
    enriched = enrich_decision_maker(
        decision_makers[0].copy(),
        "Geir",
        "Håøy",
        company
    )
    
    print(f"Name: {enriched['name']}")
    print(f"Guessed email: {enriched.get('email', 'N/A')}")
    print(f"Alternative emails: {enriched.get('email_alternatives', [])}")
    print(f"LinkedIn search: {enriched.get('linkedin_search', 'N/A')}")
