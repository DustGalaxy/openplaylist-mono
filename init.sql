CREATE USER openplaylist_mono_user WITH PASSWORD '1111';
CREATE DATABASE openplaylist_mono OWNER openplaylist_mono_user;

GRANT ALL PRIVILEGES ON DATABASE openplaylist_mono TO openplaylist_mono_user;