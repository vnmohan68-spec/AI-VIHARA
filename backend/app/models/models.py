from sqlalchemy import Column, String, DateTime, Boolean, Integer, Float, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func
import uuid
import enum


class Base(DeclarativeBase):
    pass


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True, default=gen_uuid)
    name          = Column(String(128), nullable=False)
    email         = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    language      = Column(String(20), default="English")
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    is_active     = Column(Boolean, default=True)

    saved_places  = relationship("SavedPlace", back_populates="user", cascade="all, delete-orphan")
    scan_history  = relationship("ScanHistory", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")


class Monument(Base):
    __tablename__ = "monuments"
    id           = Column(String, primary_key=True, default=gen_uuid)
    name         = Column(String(256), nullable=False, index=True)
    location     = Column(String(256), nullable=False)
    state        = Column(String(128), nullable=False, index=True)
    type         = Column(String(128))
    description  = Column(Text)
    history      = Column(Text)
    mythology    = Column(Text)
    architecture = Column(Text)
    best_time    = Column(String(256))
    hidden_facts = Column(JSON)     # List[str]
    nearby       = Column(JSON)     # List[str]
    local_food   = Column(JSON)     # List[str]
    photo_tips   = Column(Text)
    lat          = Column(Float)
    lng          = Column(Float)
    tags         = Column(JSON)     # List[str]
    image_url    = Column(String(512))
    is_hidden_gem= Column(Boolean, default=False)
    hidden_score = Column(Integer, default=0)
    crowd_level  = Column(String(32))
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    embedding_id = Column(String(256))  # ID in vector DB


class SavedPlace(Base):
    __tablename__ = "saved_places"
    id          = Column(String, primary_key=True, default=gen_uuid)
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    monument_id = Column(String, ForeignKey("monuments.id"))
    name        = Column(String(256))
    location    = Column(String(256))
    type        = Column(String(128))
    note        = Column(Text)
    saved_at    = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="saved_places")


class ScanHistory(Base):
    __tablename__ = "scan_history"
    id          = Column(String, primary_key=True, default=gen_uuid)
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    image_url   = Column(String(512))
    monument_id = Column(String, ForeignKey("monuments.id"))
    result_json = Column(JSON)
    mode        = Column(String(64))
    language    = Column(String(32))
    scanned_at  = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="scan_history")


class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id         = Column(String, primary_key=True, default=gen_uuid)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False)
    title      = Column(String(256))
    mode       = Column(String(64), default="Story Mode")
    language   = Column(String(32), default="English")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user     = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id         = Column(String, primary_key=True, default=gen_uuid)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    role       = Column(String(16), nullable=False)  # 'user' | 'assistant'
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")


class HiddenGem(Base):
    __tablename__ = "hidden_gems"
    id           = Column(String, primary_key=True, default=gen_uuid)
    monument_id  = Column(String, ForeignKey("monuments.id"))
    name         = Column(String(256), nullable=False)
    state        = Column(String(128), nullable=False, index=True)
    region       = Column(String(256))
    type         = Column(String(128))
    story        = Column(Text)
    best_time    = Column(String(256))
    crowd_level  = Column(String(32))
    photo_spot   = Column(Text)
    local_food   = Column(Text)
    hidden_score = Column(Integer, default=0)
    tags         = Column(JSON)
    lat          = Column(Float)
    lng          = Column(Float)
    image_url    = Column(String(512))
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    embedding_id = Column(String(256))
