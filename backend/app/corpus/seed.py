SEED_QUESTIONS = [
    {"question": "How many days of annual leave do full-time employees receive?", "expected_status": "conflict_resolved"},
    {"question": "How many days per week can employees work remotely?", "expected_status": "conflict_resolved"},
    {"question": "What is the maximum daily meal and expense reimbursement limit?", "expected_status": "conflict_unresolved"},
    {"question": "What are the standard company office hours?", "expected_status": "consistent"},
    {"question": "What is the company policy on bringing pets to the office?", "expected_status": "insufficient_evidence"}
]

# 11 documents across 5 families for Northwind Labs
RAW_SEED_DOCS = [
    # Scenario A: Supersession by amendment (family: leave-policy)
    """---
doc_id: leave-policy-v1
title: Northwind Annual Leave Policy
doc_type: policy
version: v1
effective_date: 2023-01-01
family: leave-policy
supersedes: []
---
# Annual Leave Entitlement

All full-time employees at Northwind Labs receive 12 days of paid annual leave per calendar year. Leave requests must be submitted at least two weeks in advance.
""",
    """---
doc_id: leave-policy-amendment-2025
title: March 2025 Annual Leave Amendment
doc_type: amendment
version: v2
effective_date: 2025-03-01
family: leave-policy
supersedes: [leave-policy-v1]
---
# Amendment to Annual Leave Entitlement

Effective March 1, 2025, this amendment supersedes leave-policy-v1. All full-time employees at Northwind Labs now receive 18 days of paid annual leave per calendar year.
""",

    # Scenario B: Stale FAQ + v1 policy contradicted by v2 policy (family: remote-work)
    """---
doc_id: remote-work-faq-2023
title: Remote Work Employee FAQ
doc_type: faq
version: v1
effective_date: 2023-05-01
family: remote-work
supersedes: []
---
# Remote Work Frequency FAQ

Q: How many days per week can employees work remotely?
A: Employees at Northwind Labs are allowed to work remotely up to 2 days per week with manager approval.
""",
    """---
doc_id: remote-work-policy-v1
title: Remote Work Policy
doc_type: policy
version: v1
effective_date: 2024-01-01
family: remote-work
supersedes: [remote-work-faq-2023]
---
# Hybrid Work Schedule

Under the v1 hybrid schedule, Northwind Labs employees are permitted to work remotely 2 days per week.
""",
    """---
doc_id: remote-work-policy-v2
title: Remote Work Policy
doc_type: policy
version: v2
effective_date: 2025-01-15
family: remote-work
supersedes: [remote-work-policy-v1, remote-work-faq-2023]
---
# Updated Hybrid Work Schedule

Effective January 15, 2025, Northwind Labs employees are permitted to work remotely up to 3 days per week. This policy supersedes v1 and the 2023 Remote Work FAQ.
""",

    # Scenario C: Unresolvable conflict (same date, same doc_type, different families, no supersedes)
    """---
doc_id: expense-memo-finance
title: Finance Meal Reimbursement Memo
doc_type: memo
version: v1
effective_date: 2024-06-01
family: finance-travel-rules
supersedes: []
---
# Daily Meal and Expense Limit

For employees traveling on company business, the maximum daily meal and expense reimbursement limit is $50 per day.
""",
    """---
doc_id: expense-memo-ops
title: Operations Travel Reimbursement Memo
doc_type: memo
version: v1
effective_date: 2024-06-01
family: ops-travel-rules
supersedes: []
---
# Daily Meal and Expense Limit

For employees traveling on company business, the maximum daily meal and expense reimbursement limit is $75 per day.
""",

    # Scenario D: Consistent answer across multiple sources (family: office-operations)
    """---
doc_id: office-hours-policy-v1
title: Standard Office Hours Policy
doc_type: policy
version: v1
effective_date: 2023-02-01
family: office-operations
supersedes: []
---
# Core Office Hours

Standard company office hours at Northwind Labs are 9:00 AM to 5:00 PM, Monday through Friday.
""",
    """---
doc_id: office-hours-faq-2024
title: Office Operations FAQ
doc_type: faq
version: v1
effective_date: 2024-02-01
family: office-operations
supersedes: []
---
# Office Hours Question

Q: What are the standard company office hours?
A: Northwind Labs operates from 9:00 AM to 5:00 PM, Monday through Friday.
""",

    # Additional documents to satisfy 10-12 documents requirement
    """---
doc_id: security-password-policy-v1
title: Information Security Password Policy
doc_type: policy
version: v1
effective_date: 2023-09-01
family: infosec-policy
supersedes: []
---
# Password Rotation and Complexity

All Northwind Labs employees must use a minimum 14-character password and enable hardware multi-factor authentication on corporate accounts.
""",
    """---
doc_id: parental-leave-policy-v1
title: Parental Leave Policy
doc_type: policy
version: v1
effective_date: 2024-04-01
family: leave-policy
supersedes: []
---
# Paid Parental Leave

Eligible full-time employees receive 16 weeks of fully paid parental leave following the birth or adoption of a child.
"""
]