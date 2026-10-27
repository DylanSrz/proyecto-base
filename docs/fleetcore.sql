--
-- PostgreSQL database dump
--

\restrict UMruL7bnXwSRPoN388gn3sviiqGEvJf6H7HM67Zqz9tdr73VY7z1cUTgIlgAsJh

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: maintenance_status_logs_from_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maintenance_status_logs_from_status_enum AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: maintenance_status_logs_to_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maintenance_status_logs_to_status_enum AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: maintenances_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maintenances_status_enum AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: maintenances_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maintenances_type_enum AS ENUM (
    'PREVENTIVE',
    'CORRECTIVE'
);


--
-- Name: mechanics_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.mechanics_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_role_enum AS ENUM (
    'ADMIN',
    'TECHNICIAN'
);


--
-- Name: vehicles_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vehicles_status_enum AS ENUM (
    'AVAILABLE',
    'IN_MAINTENANCE',
    'INACTIVE'
);


--
-- Name: workshops_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workshops_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: maintenance_status_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_status_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    maintenance_id uuid NOT NULL,
    from_status public.maintenance_status_logs_from_status_enum,
    to_status public.maintenance_status_logs_to_status_enum NOT NULL,
    changed_by_id uuid,
    note text
);


--
-- Name: maintenances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenances (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    type public.maintenances_type_enum NOT NULL,
    description text NOT NULL,
    mileage integer NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    estimated_end_at timestamp with time zone NOT NULL,
    status public.maintenances_status_enum DEFAULT 'SCHEDULED'::public.maintenances_status_enum NOT NULL,
    started_at timestamp with time zone,
    work_performed text,
    final_cost numeric(12,2),
    finished_at timestamp with time zone,
    final_mileage integer,
    vehicle_id uuid NOT NULL,
    mechanic_id uuid NOT NULL,
    workshop_id uuid NOT NULL
);


--
-- Name: mechanics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mechanics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    specialty character varying(100) NOT NULL,
    status public.mechanics_status_enum DEFAULT 'ACTIVE'::public.mechanics_status_enum NOT NULL,
    user_id uuid
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password character varying NOT NULL,
    role public.users_role_enum DEFAULT 'TECHNICIAN'::public.users_role_enum NOT NULL
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    plate character varying(10) NOT NULL,
    brand character varying(60) NOT NULL,
    model character varying(60) NOT NULL,
    year integer NOT NULL,
    mileage integer DEFAULT 0 NOT NULL,
    status public.vehicles_status_enum DEFAULT 'AVAILABLE'::public.vehicles_status_enum NOT NULL
);


--
-- Name: workshops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workshops (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(100) NOT NULL,
    address character varying(200) NOT NULL,
    status public.workshops_status_enum DEFAULT 'ACTIVE'::public.workshops_status_enum NOT NULL
);


--
-- Data for Name: maintenance_status_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maintenance_status_logs (id, created_at, updated_at, deleted_at, maintenance_id, from_status, to_status, changed_by_id, note) FROM stdin;
94413a37-9ed3-4a29-89f5-36482fd5624e	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	2653166c-c66d-43e6-9619-5caadc7ba47d	\N	SCHEDULED	f55988bf-d705-4a9a-a7ff-6ea95ffcff64	\N
4a2b8204-a145-4ce9-a9cf-81805009d23b	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	2653166c-c66d-43e6-9619-5caadc7ba47d	SCHEDULED	IN_PROGRESS	0f103042-58db-41ce-8c71-849896941acf	\N
bc7c7514-b635-4b3e-8cd9-acd0eee08ff7	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	2653166c-c66d-43e6-9619-5caadc7ba47d	IN_PROGRESS	COMPLETED	0f103042-58db-41ce-8c71-849896941acf	\N
f95d66b2-498a-4cb6-969d-ffc94538557a	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	00ecec0d-3383-4e6a-9670-e67727995896	\N	SCHEDULED	f55988bf-d705-4a9a-a7ff-6ea95ffcff64	\N
85d40b16-9427-45de-9ba9-1038fdd67c9e	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	00ecec0d-3383-4e6a-9670-e67727995896	SCHEDULED	IN_PROGRESS	94a78fcc-ac1c-43f2-8850-84a61c1a6f32	\N
ce99e418-e202-415f-87cf-3381571a4671	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	00ecec0d-3383-4e6a-9670-e67727995896	IN_PROGRESS	COMPLETED	94a78fcc-ac1c-43f2-8850-84a61c1a6f32	\N
8aaab598-1cbe-4883-b2a3-e8df89325539	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	0de52def-135b-4a70-9d55-cd356e057183	\N	SCHEDULED	f55988bf-d705-4a9a-a7ff-6ea95ffcff64	\N
210c244e-4b76-45b2-b3ab-961cf5528cd4	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	0de52def-135b-4a70-9d55-cd356e057183	SCHEDULED	IN_PROGRESS	0f103042-58db-41ce-8c71-849896941acf	\N
5d509aa7-0cf0-4df3-ae3c-48e7e05a5dab	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	59c20488-fb3c-4924-9a38-71b79c431dc8	\N	SCHEDULED	f55988bf-d705-4a9a-a7ff-6ea95ffcff64	\N
\.


--
-- Data for Name: maintenances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maintenances (id, created_at, updated_at, deleted_at, type, description, mileage, scheduled_at, estimated_end_at, status, started_at, work_performed, final_cost, finished_at, final_mileage, vehicle_id, mechanic_id, workshop_id) FROM stdin;
2653166c-c66d-43e6-9619-5caadc7ba47d	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	PREVENTIVE	Oil and filter change	45000	2026-09-15 14:00:00+00	2026-09-15 16:30:00+00	COMPLETED	2026-09-15 14:05:00+00	Changed engine oil, oil filter and air filter	350000.00	2026-09-15 16:30:00+00	45000	04e4f1b7-2189-4d69-88dc-3e22eedd0cb5	8e574389-98ee-44d1-98af-46e4466c4835	e4d29b6c-548c-4cfa-9098-6b6ed5647e26
00ecec0d-3383-4e6a-9670-e67727995896	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	CORRECTIVE	Brake pad replacement	52300	2026-10-10 12:00:00+00	2026-10-10 14:00:00+00	COMPLETED	2026-10-10 12:00:00+00	Replaced front and rear brake pads	480000.00	2026-10-10 14:00:00+00	52300	04e4f1b7-2189-4d69-88dc-3e22eedd0cb5	c1fbb837-a12c-4864-ab07-62bfb6595bcb	e4d29b6c-548c-4cfa-9098-6b6ed5647e26
0de52def-135b-4a70-9d55-cd356e057183	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	CORRECTIVE	Clutch kit replacement	88000	2026-10-27 18:44:08.653+00	2026-10-27 22:44:08.653+00	IN_PROGRESS	2026-10-27 18:44:08.653+00	\N	\N	\N	\N	ebb9a67c-179e-4492-911c-dc19ce4c68dc	8e574389-98ee-44d1-98af-46e4466c4835	e4d29b6c-548c-4cfa-9098-6b6ed5647e26
59c20488-fb3c-4924-9a38-71b79c431dc8	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	PREVENTIVE	30,000 km preventive inspection	31000	2026-10-28 07:30:00+00	2026-10-28 09:00:00+00	SCHEDULED	\N	\N	\N	\N	\N	0aea9bb7-4c49-4d54-81e4-01f2bc31bb0d	c1fbb837-a12c-4864-ab07-62bfb6595bcb	e4d29b6c-548c-4cfa-9098-6b6ed5647e26
\.


--
-- Data for Name: mechanics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mechanics (id, created_at, updated_at, deleted_at, name, email, specialty, status, user_id) FROM stdin;
8e574389-98ee-44d1-98af-46e4466c4835	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	Carlos Perez	carlos.perez@fleetcore.com	Engines	ACTIVE	0f103042-58db-41ce-8c71-849896941acf
c1fbb837-a12c-4864-ab07-62bfb6595bcb	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	Laura Gomez	laura.gomez@fleetcore.com	Brakes and suspension	ACTIVE	94a78fcc-ac1c-43f2-8850-84a61c1a6f32
35caa06d-975f-45d8-a08d-c90f3610ac56	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	Andres Rios	andres.rios@fleetcore.com	Electrical systems	INACTIVE	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, created_at, updated_at, deleted_at, name, email, password, role) FROM stdin;
f55988bf-d705-4a9a-a7ff-6ea95ffcff64	2026-10-27 19:44:05.885161+00	2026-10-27 19:44:05.885161+00	\N	Administrator	admin@fleetcore.com	$2b$10$R0xLVe0AfMkZAuMy/GvmBeFm5cwo7/lkZ6kcOKJWlsZb9iwnxbFAe	ADMIN
0f103042-58db-41ce-8c71-849896941acf	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	Carlos Perez	carlos.perez@fleetcore.com	$2b$10$9tpWrKbMRLLypLXEF9ZwmOOVtjDhME.KdTsIxv13zfdIo5swJ6Eby	TECHNICIAN
94a78fcc-ac1c-43f2-8850-84a61c1a6f32	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	Laura Gomez	laura.gomez@fleetcore.com	$2b$10$9tpWrKbMRLLypLXEF9ZwmOOVtjDhME.KdTsIxv13zfdIo5swJ6Eby	TECHNICIAN
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vehicles (id, created_at, updated_at, deleted_at, plate, brand, model, year, mileage, status) FROM stdin;
04e4f1b7-2189-4d69-88dc-3e22eedd0cb5	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	ABC123	Chevrolet	NPR	2020	52300	AVAILABLE
0aea9bb7-4c49-4d54-81e4-01f2bc31bb0d	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	DEF456	Toyota	Hilux	2022	31000	AVAILABLE
ebb9a67c-179e-4492-911c-dc19ce4c68dc	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	GHI789	Hino	300	2019	88000	IN_MAINTENANCE
9ce456af-d7fb-44f9-b079-54bb4d56ad51	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	JKL012	Ford	Cargo	2015	150000	INACTIVE
\.


--
-- Data for Name: workshops; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workshops (id, created_at, updated_at, deleted_at, name, address, status) FROM stdin;
e4d29b6c-548c-4cfa-9098-6b6ed5647e26	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	North Workshop	45th Street #12-30, Medellin	ACTIVE
6d5c9c77-6c30-4ee0-a3e5-0efd689f9073	2026-10-27 19:44:08.546014+00	2026-10-27 19:44:08.546014+00	\N	Downtown Workshop	10th Avenue #5-21, Medellin	INACTIVE
\.


--
-- Name: maintenance_status_logs PK_08d4922ce507b9f184dd302ba70; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_status_logs
    ADD CONSTRAINT "PK_08d4922ce507b9f184dd302ba70" PRIMARY KEY (id);


--
-- Name: vehicles PK_18d8646b59304dce4af3a9e35b6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY (id);


--
-- Name: mechanics PK_2c0ed23afc0cc7ff361c17e53df; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mechanics
    ADD CONSTRAINT "PK_2c0ed23afc0cc7ff361c17e53df" PRIMARY KEY (id);


--
-- Name: maintenances PK_62403473bd524a42d58589aa78b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenances
    ADD CONSTRAINT "PK_62403473bd524a42d58589aa78b" PRIMARY KEY (id);


--
-- Name: workshops PK_6d0e82a124f5b53df91c8989848; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshops
    ADD CONSTRAINT "PK_6d0e82a124f5b53df91c8989848" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: mechanics UQ_301c3b5fa2d49aab65dcfda36a6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mechanics
    ADD CONSTRAINT "UQ_301c3b5fa2d49aab65dcfda36a6" UNIQUE (email);


--
-- Name: mechanics UQ_4e69c5d1d5ef843a571535ccfde; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mechanics
    ADD CONSTRAINT "UQ_4e69c5d1d5ef843a571535ccfde" UNIQUE (user_id);


--
-- Name: workshops UQ_84a8c763773a6482ba066f608c3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshops
    ADD CONSTRAINT "UQ_84a8c763773a6482ba066f608c3" UNIQUE (name);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: vehicles UQ_ec7181ebdab798d97070122a5bf; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT "UQ_ec7181ebdab798d97070122a5bf" UNIQUE (plate);


--
-- Name: IDX_3c1b42caf9098095ac185eaaad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3c1b42caf9098095ac185eaaad" ON public.maintenances USING btree (mechanic_id, status);


--
-- Name: IDX_4c29d9ab34835c37d1724cf860; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4c29d9ab34835c37d1724cf860" ON public.maintenances USING btree (vehicle_id, status);


--
-- Name: mechanics FK_4e69c5d1d5ef843a571535ccfde; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mechanics
    ADD CONSTRAINT "FK_4e69c5d1d5ef843a571535ccfde" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: maintenance_status_logs FK_5a63b17992f948e108b002437d1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_status_logs
    ADD CONSTRAINT "FK_5a63b17992f948e108b002437d1" FOREIGN KEY (changed_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: maintenance_status_logs FK_606e251feba3411998ceb13cd95; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_status_logs
    ADD CONSTRAINT "FK_606e251feba3411998ceb13cd95" FOREIGN KEY (maintenance_id) REFERENCES public.maintenances(id) ON DELETE CASCADE;


--
-- Name: maintenances FK_a47e3420d123ccf06ab72e1969c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenances
    ADD CONSTRAINT "FK_a47e3420d123ccf06ab72e1969c" FOREIGN KEY (workshop_id) REFERENCES public.workshops(id) ON DELETE RESTRICT;


--
-- Name: maintenances FK_d501088741618ca66074d85e411; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenances
    ADD CONSTRAINT "FK_d501088741618ca66074d85e411" FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT;


--
-- Name: maintenances FK_f92519be34af2de954da0bd4a47; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenances
    ADD CONSTRAINT "FK_f92519be34af2de954da0bd4a47" FOREIGN KEY (mechanic_id) REFERENCES public.mechanics(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict UMruL7bnXwSRPoN388gn3sviiqGEvJf6H7HM67Zqz9tdr73VY7z1cUTgIlgAsJh

