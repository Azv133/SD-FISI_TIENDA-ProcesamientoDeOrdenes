DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Roles;

CREATE TABLE Roles (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255)
);

CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    id_rol INTEGER REFERENCES Roles(id),
    nombres VARCHAR(255),
    apellidos VARCHAR(255),
    correo VARCHAR(255) unique,
    ruc VARCHAR(255),
	password VARCHAR(255)
);

INSERT INTO Roles (description) VALUES ('Client');
INSERT INTO Roles (description) VALUES ('Admin');

-- Insertar un usuario con rol "Admin"
INSERT INTO Users (id_rol, nombres, apellidos, correo, ruc, password)
VALUES (1, 'Adrian', 'Zavaleta', 'adrian.zavaleta@unmsm.edu.pe', '103325187', '$2a$12$qOz/a0rX1qGWzVmVICuAJOBUWsn86ftT8rp9MdLNjcXxPpIF0/ry6');

-- Insertar un usuario con rol "Client"
INSERT INTO Users (id_rol, nombres, apellidos, correo, ruc, password)
VALUES (2, 'Ricardo G.', 'Torres', 'ricardo.torres@unmsm.edu.pe', '20235100', '$2a$12$qOz/a0rX1qGWzVmVICuAJOBUWsn86ftT8rp9MdLNjcXxPpIF0/ry6');
