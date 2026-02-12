INSERT INTO studies (slug, name, description)
VALUES
    (
        'regulatory-pressure-gauge',
        'Regulatory Pressure Gauge',
        'Tracks perceived regulatory pressure across key populations and sectors.'
    )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO survey_waves (study_id, label, wave_date)
SELECT s.id, x.label, x.wave_date
FROM studies s
JOIN (
    VALUES
        ('2024 Q3', DATE '2024-09-30'),
        ('2024 Q4', DATE '2024-12-31'),
        ('2025 Q1', DATE '2025-03-31'),
        ('2025 Q2', DATE '2025-06-30')
) AS x(label, wave_date) ON TRUE
WHERE s.slug = 'regulatory-pressure-gauge'
ON CONFLICT DO NOTHING;

INSERT INTO questions (study_id, code, prompt, metric_type)
SELECT s.id, q.code, q.prompt, q.metric_type
FROM studies s
JOIN (
    VALUES
        ('regulatory_pressure', 'How intense is regulatory pressure on your organization?', '0_100_index'),
        ('policy_confidence', 'How confident are you in policy predictability?', '0_100_index')
) AS q(code, prompt, metric_type) ON TRUE
WHERE s.slug = 'regulatory-pressure-gauge'
ON CONFLICT (study_id, code) DO NOTHING;

WITH study AS (
    SELECT id FROM studies WHERE slug = 'regulatory-pressure-gauge'
),
waves AS (
    SELECT sw.id, sw.label
    FROM survey_waves sw
    JOIN study s ON s.id = sw.study_id
),
respondent_seed AS (
    SELECT *
    FROM (
        VALUES
            ('North', 'Healthcare', 'Female', 'Democrat', '35-44'),
            ('North', 'Finance', 'Male', 'Independent', '45-54'),
            ('South', 'Energy', 'Male', 'Republican', '45-54'),
            ('West', 'Technology', 'Female', 'Democrat', '25-34'),
            ('Midwest', 'Manufacturing', 'Male', 'Republican', '55-64'),
            ('South', 'Healthcare', 'Female', 'Independent', '35-44'),
            ('West', 'Finance', 'Male', 'Democrat', '25-34'),
            ('North', 'Technology', 'Female', 'Independent', '35-44')
    ) AS r(region, industry, gender, vote, age_bucket)
)
INSERT INTO respondents (wave_id, region, industry, gender, vote, age_bucket)
SELECT w.id, rs.region, rs.industry, rs.gender, rs.vote, rs.age_bucket
FROM waves w
CROSS JOIN respondent_seed rs;

WITH study AS (
    SELECT id FROM studies WHERE slug = 'regulatory-pressure-gauge'
),
question_ids AS (
    SELECT q.id, q.code
    FROM questions q
    JOIN study s ON s.id = q.study_id
),
response_rows AS (
    SELECT
        r.id AS respondent_id,
        q.id AS question_id,
        q.code,
        sw.label,
        r.industry,
        r.region,
        r.gender,
        r.vote
    FROM respondents r
    JOIN survey_waves sw ON sw.id = r.wave_id
    JOIN study s ON s.id = sw.study_id
    CROSS JOIN question_ids q
)
INSERT INTO responses (respondent_id, question_id, numeric_value, answer_text)
SELECT
    rr.respondent_id,
    rr.question_id,
    CASE
        WHEN rr.code = 'regulatory_pressure' THEN
            45
            + CASE rr.label
                WHEN '2024 Q3' THEN 3
                WHEN '2024 Q4' THEN 6
                WHEN '2025 Q1' THEN 9
                ELSE 11
              END
            + CASE rr.industry
                WHEN 'Energy' THEN 8
                WHEN 'Healthcare' THEN 5
                WHEN 'Finance' THEN 2
                WHEN 'Technology' THEN -3
                ELSE 1
              END
            + CASE rr.region
                WHEN 'South' THEN 2
                WHEN 'North' THEN 1
                ELSE 0
              END
            + CASE rr.gender
                WHEN 'Female' THEN 1
                ELSE 0
              END
        WHEN rr.code = 'policy_confidence' THEN
            60
            - CASE rr.label
                WHEN '2024 Q3' THEN 4
                WHEN '2024 Q4' THEN 2
                WHEN '2025 Q1' THEN 1
                ELSE 0
              END
            + CASE rr.vote
                WHEN 'Independent' THEN -1
                WHEN 'Democrat' THEN 2
                ELSE 0
              END
            + CASE rr.industry
                WHEN 'Technology' THEN 3
                WHEN 'Manufacturing' THEN -2
                ELSE 0
              END
        ELSE 50
    END AS numeric_value,
    NULL
FROM response_rows rr;
