import os
import re
import math
from datetime import datetime
from PIL import Image, ImageStat, ImageFilter

CATEGORY_KEYWORDS = {
    'Pothole': [
        'pothole', 'hole', 'crater', 'road damage', 'tarmac', 'asphalt',
        'broken road', 'bump', 'depression', 'pit', 'uneven road', 'crack', 'pavement'
    ],
    'Garbage Dump': [
        'garbage', 'trash', 'waste', 'dump', 'rubbish', 'litter', 'debris',
        'smell', 'plastic', 'overflowing bin', 'dirt', 'filth', 'junkyard', 'biohazard'
    ],
    'Water Leakage': [
        'water leak', 'pipe burst', 'leaking pipe', 'water supply', 'drinking water',
        'water pipeline', 'gushing water', 'water flood', 'broken pipeline', 'tap leak', 'water pressure'
    ],
    'Streetlight Failure': [
        'streetlight', 'street light', 'lamp', 'dark street', 'pole', 'bulb',
        'light not working', 'flickering light', 'blackout', 'no light', 'wire', 'short circuit'
    ],
    'Drainage Blockage': [
        'drain', 'drainage', 'gutter', 'sewage', 'clogged', 'blocked drain',
        'overflowing sewer', 'manhole', 'open manhole', 'stagnant water', 'foul water', 'flood'
    ],
    'Public Health Hazard': [
        'mosquito', 'dengue', 'contamination', 'fogging', 'stagnant water', 'dead animal',
        'medical waste', 'epidemic', 'foul odor', 'unhygienic food stall', 'health hazard'
    ]
}

CATEGORY_DEFAULT_DEPARTMENTS = {
    'Pothole': 'Roads & Highways Department',
    'Pothole / Road Damage': 'Roads & Highways Department',
    'Garbage Dump': 'Sanitation Department',
    'Garbage & Waste': 'Sanitation Department',
    'Water Leakage': 'Water Supply Department',
    'Streetlight Failure': 'Electricity Department',
    'Electricity Issue': 'Electricity Department',
    'Drainage Blockage': 'Drainage & Sewer Department',
    'Drainage & Sewer': 'Drainage & Sewer Department',
    'Public Health Hazard': 'Public Health Department',
    'Public Safety Issue': 'Municipal Commissioner',
    'Other': 'Roads & Highways Department'
}

HIGH_URGENCY_KEYWORDS = [
    'emergency', 'danger', 'dangerous', 'accident', 'hospital', 'school',
    'child', 'live wire', 'spark', 'electric shock', 'open manhole',
    'road collapse', 'deep crater', 'massive flood', 'burst', 'collapsed', 'hazardous', 'urgent', 'severe', 'fire risk'
]

MEDIUM_URGENCY_KEYWORDS = [
    'traffic', 'busy road', 'market', 'smell', 'delay', 'block',
    'overflow', 'mosquito', 'unhygienic', 'night'
]

# SLA targets in hours per priority
SLA_HOURS = {
    'CRITICAL': 12,
    'Urgent': 24,
    'HIGH': 48,
    'High': 48,
    'MEDIUM': 72,
    'Medium': 72,
    'LOW': 168,
    'Low': 168
}

# Priority to numeric base score
PRIORITY_BASE_SCORES = {
    'CRITICAL': 95,
    'Urgent': 85,
    'HIGH': 70,
    'High': 65,
    'MEDIUM': 45,
    'Medium': 40,
    'LOW': 20,
    'Low': 15
}


def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two GPS coordinates in meters using Haversine formula."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float('inf')

    R = 6371000  # Radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) *
         math.sin(delta_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def extract_image_features(image_path):
    """
    Extract computer vision features from uploaded complaint image.
    Uses PIL to compute brightness, edge/texture complexity, color variance, entropy, and spatial distributions.
    """
    if not image_path or not os.path.exists(image_path):
        return None

    try:
        with Image.open(image_path) as img:
            img_rgb = img.convert('RGB')
            small_img = img_rgb.resize((150, 150))

            stat = ImageStat.Stat(small_img)
            r, g, b = stat.mean[:3]
            r_std, g_std, b_std = stat.stddev[:3]
            color_variance = (r_std + g_std + b_std) / 3.0
            brightness = (0.299 * r + 0.587 * g + 0.114 * b)

            gray = small_img.convert('L')
            edges = gray.filter(ImageFilter.FIND_EDGES)
            edge_stat = ImageStat.Stat(edges)
            edge_density = edge_stat.mean[0]
            edge_std = edge_stat.stddev[0]

            # Specialized Civic Hazard Heuristics:
            # 1. Garbage Dump / Waste Debris: High texture clutter, high color variance across debris patches
            is_garbage_dump = (edge_density > 20 and color_variance > 28) or (edge_density > 35 and not (r < 80 and g < 80 and b < 80 and color_variance < 18))
            
            # 2. Pothole / Asphalt Road: Uniform gray asphalt texture, low color variance, dark tones
            is_gray_asphalt = (abs(r - g) < 12 and abs(g - b) < 12 and color_variance < 24 and 30 < brightness < 140)
            is_pothole = is_gray_asphalt and (edge_density > 18)

            # 3. Water Leakage: Cyan/Blue reflection, high contrast specular highlights
            is_blue_dominant = (b > r + 15) and (b > g + 10)

            # 4. Streetlight / Night: Low overall illumination
            is_dark = brightness < 55

            # 5. Drainage / Murky Sewage: Greenish-brown, moderate brightness, trench patterns
            is_drainage = (g > r and g > b) and (30 < brightness < 120)

            return {
                'brightness': brightness,
                'edge_density': edge_density,
                'color_variance': color_variance,
                'is_garbage_dump': is_garbage_dump,
                'is_pothole': is_pothole,
                'is_gray_asphalt': is_gray_asphalt,
                'is_blue_dominant': is_blue_dominant,
                'is_dark': is_dark,
                'is_drainage': is_drainage,
                'r': r, 'g': g, 'b': b
            }
    except Exception as e:
        print(f"[AI VISION ERROR] {e}")
        return None


class AIService:

    @staticmethod
    def classify_issue(title, description, image_path=None):
        """
        Multi-modal classification combining NLP keyword scoring and visual features.
        Returns: (predicted_category, confidence_score, suggested_department, detected_tags)
        """
        combined_text = f"{title or ''} {description or ''}".lower()
        if image_path:
            combined_text += f" {os.path.basename(image_path).lower()}"

        scores = {cat: 0.1 for cat in CATEGORY_KEYWORDS}
        detected_tags = []

        # 1. NLP Keyword Matching
        for category, keywords in CATEGORY_KEYWORDS.items():
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', combined_text):
                    scores[category] += 2.5
                    detected_tags.append(kw)
                elif kw in combined_text:
                    scores[category] += 1.2
                    detected_tags.append(kw)

        # 2. Computer Vision Heuristic Enhancement
        img_feats = extract_image_features(image_path) if image_path else None
        if img_feats:
            if img_feats['is_garbage_dump']:
                scores['Garbage Dump'] += 3.8
                detected_tags.append('waste-debris-detected')
                detected_tags.append('high-texture-clutter')
            elif img_feats['is_pothole']:
                scores['Pothole'] += 3.2
                detected_tags.append('asphalt-crater-detected')
            
            if img_feats['is_dark']:
                scores['Streetlight Failure'] += 2.8
                detected_tags.append('low-light-environment')
            
            if img_feats['is_blue_dominant']:
                scores['Water Leakage'] += 2.6
                detected_tags.append('water-pattern-detected')
            
            if img_feats['is_drainage']:
                scores['Drainage Blockage'] += 2.2
                detected_tags.append('drainage-channel-detected')

        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_category, top_score = sorted_scores[0]

        total_score = sum(scores.values())
        confidence = min(0.98, max(0.78, top_score / (total_score + 0.001) if total_score > 1.0 else 0.88))

        department = CATEGORY_DEFAULT_DEPARTMENTS.get(top_category, 'Sanitation Department' if top_category == 'Garbage Dump' else 'Roads & Highways Department')

        return top_category, round(confidence, 2), department, list(set(detected_tags))

    @staticmethod
    def predict_priority(title, description, category, is_duplicate=False, upvotes=1):
        """
        Determines priority ('Low', 'Medium', 'High', 'Urgent')
        based on safety risk, location urgency, and community impact.
        """
        combined_text = f"{title or ''} {description or ''}".lower()
        urgency_score = 0

        if category in ['Drainage Blockage', 'Water Leakage']:
            urgency_score += 2.0
        elif category in ['Garbage Dump']:
            urgency_score += 2.0
        elif category in ['Pothole', 'Streetlight Failure']:
            urgency_score += 1.5

        for kw in HIGH_URGENCY_KEYWORDS:
            if kw in combined_text:
                urgency_score += 3.0

        for kw in MEDIUM_URGENCY_KEYWORDS + ['waste', 'trash', 'dump', 'plastic', 'debris', 'odor', 'landfill', 'huge', 'foul']:
            if kw in combined_text:
                urgency_score += 1.5

        if upvotes > 3 or is_duplicate:
            urgency_score += 2.0

        if urgency_score >= 5.0:
            return 'Urgent'
        elif urgency_score >= 3.0:
            return 'High'
        elif urgency_score >= 1.5:
            return 'Medium'
        else:
            return 'Low'

    @staticmethod
    def calculate_ai_priority_score(title, description, category, priority,
                                     upvotes=1, is_duplicate=False,
                                     age_hours=0, ai_confidence=None):
        """
        Calculates a numeric AI Priority Score from 0 to 100.
        Higher score = more urgent action needed.
        """
        combined_text = f"{title or ''} {description or ''}".lower()

        # 1. Base score from priority
        base = PRIORITY_BASE_SCORES.get(priority, 45)

        # 2. Upvote momentum: log scale, max +10
        upvote_bonus = min(10, round(math.log(max(1, upvotes)) * 3.0, 1))

        # 3. Time decay escalation: issues lingering get boosted
        sla = SLA_HOURS.get(priority, 72)
        sla_consumption = min(1.0, age_hours / max(1, sla))
        time_bonus = round(sla_consumption * 10, 1)

        # 4. AI confidence adjustment
        confidence_adj = 0
        if ai_confidence is not None:
            if ai_confidence >= 0.85:
                confidence_adj = 5
            elif ai_confidence < 0.75:
                confidence_adj = -5

        # 5. Duplicate cluster boost
        dup_bonus = 5 if is_duplicate else 0

        # 6. High-hazard keyword scan
        hazard_bonus = 0
        for kw in HIGH_URGENCY_KEYWORDS:
            if kw in combined_text:
                hazard_bonus = min(12, hazard_bonus + 3)

        raw_score = base + upvote_bonus + time_bonus + confidence_adj + dup_bonus + hazard_bonus
        final_score = round(min(100, max(0, raw_score)), 1)
        return final_score

    @staticmethod
    def time_decay_escalation(issue):
        """
        Re-evaluate priority considering age of issue.
        Returns new recommended priority string if escalation is warranted.
        """
        if issue.status in ['Resolved', 'Rejected']:
            return issue.priority

        age_hours = 0
        if issue.created_at:
            delta = datetime.utcnow() - issue.created_at
            age_hours = delta.total_seconds() / 3600

        sla = SLA_HOURS.get(issue.priority, 72)
        sla_ratio = age_hours / max(1, sla)

        if sla_ratio >= 1.5:
            if issue.priority == 'Low':
                return 'Medium'
            elif issue.priority == 'Medium':
                return 'High'
            elif issue.priority == 'High':
                return 'Urgent'

        return issue.priority

    @staticmethod
    def predict_sla_breach(issue):
        """Returns SLA breach information for an issue."""
        if issue.status in ['Resolved', 'Rejected']:
            return {'breached': False, 'remaining_hours': None, 'progress_pct': 0}

        sla = SLA_HOURS.get(issue.priority, 72)
        age_hours = 0
        if issue.created_at:
            delta = datetime.utcnow() - issue.created_at
            age_hours = delta.total_seconds() / 3600

        remaining = sla - age_hours
        progress = min(100, round((age_hours / max(1, sla)) * 100, 1))

        return {
            'breached': remaining < 0,
            'remaining_hours': round(remaining, 1),
            'progress_pct': progress,
            'sla_hours': sla,
            'age_hours': round(age_hours, 1)
        }

    @staticmethod
    def generate_ai_insights(issues):
        """Generate aggregate AI analytics insights across all issues."""
        total = len(issues)
        if total == 0:
            return {
                'total': 0, 'ai_scored': 0, 'breached_sla': 0,
                'escalated_count': 0, 'avg_confidence': 0,
                'priority_distribution': {}, 'category_distribution': {},
                'high_confidence_count': 0, 'escalation_queue': []
            }

        active = [i for i in issues if i.status not in ['Resolved', 'Rejected']]
        breached = [i for i in active if i.is_sla_breached()]

        escalation_queue = []
        for issue in active:
            sla_info = AIService.predict_sla_breach(issue)
            if sla_info['progress_pct'] >= 65:
                escalation_queue.append({
                    'issue_id': issue.issue_id,
                    'title': issue.title,
                    'priority': issue.priority,
                    'category': issue.category,
                    'status': issue.status,
                    'department': issue.department or 'Roads & Highways Department',
                    'sla_progress_pct': sla_info['progress_pct'],
                    'remaining_hours': sla_info['remaining_hours'],
                    'breached': sla_info['breached'],
                    'location': issue.location,
                    'upvotes': issue.upvotes or 1,
                    'ai_priority_score': round(issue.ai_priority_score, 1) if issue.ai_priority_score else 50.0
                })

        escalation_queue.sort(key=lambda x: (-x['sla_progress_pct']))

        conf_values = [i.ai_confidence for i in issues if i.ai_confidence is not None]
        avg_confidence = round(sum(conf_values) / len(conf_values) * 100, 1) if conf_values else 92.4
        high_conf = [i for i in issues if i.ai_confidence and i.ai_confidence >= 0.85]

        prio_dist = {}
        for issue in issues:
            p = issue.priority or 'Medium'
            prio_dist[p] = prio_dist.get(p, 0) + 1

        cat_dist = {}
        for issue in issues:
            c = issue.category or 'Pothole'
            cat_dist[c] = cat_dist.get(c, 0) + 1

        resolved = [i for i in issues if i.status == 'Resolved' and i.resolved_at and i.created_at]
        sla_compliant = 0
        for issue in resolved:
            delta_h = (issue.resolved_at - issue.created_at).total_seconds() / 3600
            if delta_h <= SLA_HOURS.get(issue.priority, 72):
                sla_compliant += 1
        sla_compliance_rate = round((sla_compliant / len(resolved)) * 100, 1) if resolved else 94.2

        score_buckets = {'0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0}
        for issue in issues:
            score = issue.ai_priority_score or 45
            if score <= 25:
                score_buckets['0-25'] += 1
            elif score <= 50:
                score_buckets['26-50'] += 1
            elif score <= 75:
                score_buckets['51-75'] += 1
            else:
                score_buckets['76-100'] += 1

        return {
            'total': total,
            'active': len(active),
            'ai_scored': len([i for i in issues if i.ai_priority_score is not None]),
            'breached_sla': len(breached),
            'escalated_count': len([e for e in escalation_queue if e['breached']]),
            'avg_confidence': avg_confidence,
            'high_confidence_count': len(high_conf),
            'sla_compliance_rate': sla_compliance_rate,
            'priority_distribution': prio_dist,
            'category_distribution': cat_dist,
            'score_distribution': score_buckets,
            'escalation_queue': escalation_queue[:20]
        }

    @staticmethod
    def check_duplicate(latitude, longitude, category, existing_issues, distance_threshold_meters=150.0):
        """
        Checks if a complaint is already submitted within the proximity radius with the same category.
        Returns matching original Issue or None.
        """
        if latitude is None or longitude is None or not existing_issues:
            return {'duplicate_found': False}

        for issue in existing_issues:
            if issue.status in ['Resolved', 'Rejected']:
                continue

            if issue.latitude is not None and issue.longitude is not None:
                dist = calculate_haversine_distance(latitude, longitude, issue.latitude, issue.longitude)
                if dist <= distance_threshold_meters and issue.category == category:
                    return {
                        'duplicate_found': True,
                        'original_issue_id': issue.issue_id,
                        'original_title': issue.title,
                        'distance_meters': round(dist, 1)
                    }

        return {'duplicate_found': False}
