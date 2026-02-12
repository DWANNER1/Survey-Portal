CREATE TABLE IF NOT EXISTS studies (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS survey_waves (
    id SERIAL PRIMARY KEY,
    study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    wave_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    prompt TEXT NOT NULL,
    metric_type TEXT NOT NULL DEFAULT '0_100_index',
    UNIQUE(study_id, code)
);

CREATE TABLE IF NOT EXISTS respondents (
    id BIGSERIAL PRIMARY KEY,
    wave_id INT NOT NULL REFERENCES survey_waves(id) ON DELETE CASCADE,
    region TEXT,
    industry TEXT,
    gender TEXT,
    vote TEXT,
    age_bucket TEXT
);

CREATE TABLE IF NOT EXISTS responses (
    id BIGSERIAL PRIMARY KEY,
    respondent_id BIGINT NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    numeric_value NUMERIC(6,2),
    answer_text TEXT
);

CREATE TABLE IF NOT EXISTS saved_views (
    id SERIAL PRIMARY KEY,
    study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    user_external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    question_code TEXT NOT NULL,
    distribution_dimension TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_respondents_wave_id ON respondents(wave_id);
CREATE INDEX IF NOT EXISTS idx_respondents_region ON respondents(region);
CREATE INDEX IF NOT EXISTS idx_respondents_industry ON respondents(industry);
CREATE INDEX IF NOT EXISTS idx_respondents_gender ON respondents(gender);
CREATE INDEX IF NOT EXISTS idx_respondents_vote ON respondents(vote);
CREATE INDEX IF NOT EXISTS idx_responses_question ON responses(question_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_user_study ON saved_views(user_external_id, study_id);
