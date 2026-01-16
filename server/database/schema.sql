-- ============================================
-- TELFORD COMMUNITY BOARD - DATABASE SCHEMA
-- Simplified version without dollar-quoted strings
-- ============================================

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    profile_picture VARCHAR(500),
    bio TEXT,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_role CHECK (role IN ('user', 'admin', 'moderator'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================
-- BOARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS boards (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    slug VARCHAR(200) UNIQUE NOT NULL,
    layout_type VARCHAR(50) DEFAULT 'wall',
    background_color VARCHAR(7) DEFAULT '#ffffff',
    background_image VARCHAR(500),
    is_public BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT TRUE,
    allow_reactions BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    CONSTRAINT valid_hex_color CHECK (background_color ~* '^#[0-9A-F]{6}$'),
    CONSTRAINT valid_layout CHECK (layout_type IN ('wall', 'grid', 'stream', 'canvas'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_slug ON boards(slug);
CREATE INDEX IF NOT EXISTS idx_boards_created_at ON boards(created_at DESC);

-- ============================================
-- BOARD_COLLABORATORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS board_collaborators (
    id SERIAL PRIMARY KEY,
    board_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    permission_level VARCHAR(20) DEFAULT 'editor',
    invited_by INTEGER,
    invitation_token VARCHAR(100),
    invitation_status VARCHAR(20) DEFAULT 'pending',
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE(board_id, user_id),
    
    CONSTRAINT valid_permission CHECK (permission_level IN ('viewer', 'editor', 'admin')),
    CONSTRAINT valid_invitation_status CHECK (invitation_status IN ('pending', 'accepted', 'rejected'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON board_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_board_id ON board_collaborators(board_id);

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    content_type VARCHAR(50) DEFAULT 'text',
    metadata JSONB,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 200,
    height INTEGER DEFAULT 150,
    color VARCHAR(7) DEFAULT '#ffffff',
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    file_path VARCHAR(500),
    is_pinned BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    board_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_post_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_post_id) REFERENCES posts(id) ON DELETE CASCADE,
    
    CONSTRAINT valid_post_color CHECK (color ~* '^#[0-9A-F]{6}$'),
    CONSTRAINT valid_content_type CHECK (content_type IN ('text', 'image', 'link', 'video', 'file'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_board_id ON posts(board_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_parent_id ON posts(parent_post_id) WHERE parent_post_id IS NOT NULL;

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_comment_id INTEGER,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    
    CONSTRAINT non_empty_content CHECK (length(trim(content)) > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- ============================================
-- REACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reactions (
    id SERIAL PRIMARY KEY,
    reaction_type VARCHAR(20) NOT NULL,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(post_id, user_id),
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    CONSTRAINT valid_reaction CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);

-- ============================================
-- INITIAL DATA
-- ============================================
-- Note: Password will be properly hashed in the application
INSERT INTO users (username, email, password_hash, role, email_verified, display_name) 
VALUES 
('admin', 'admin@telford.com', '$2a$10$placeholderhashfordemopurposesonly', 'admin', true, 'Telford Admin')
ON CONFLICT (email) DO NOTHING;