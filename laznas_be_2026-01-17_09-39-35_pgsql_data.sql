--
-- PostgreSQL database dump
--

\restrict eLEIjR4jRqcjExW0dvZz6pDC4BKKUu67NYacn6CiKYWDkLBckoCjQeL7JYDYMS5

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

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

DROP INDEX public.zakat_images_type_key;
DROP INDEX public.app_settings_key_key;
DROP INDEX public."Transactions_referenceId_key";
DROP INDEX public."Transactions_flipTransactionId_key";
DROP INDEX public."Admin_username_key";
ALTER TABLE ONLY public.zakat_images DROP CONSTRAINT zakat_images_pkey;
ALTER TABLE ONLY public.app_settings DROP CONSTRAINT app_settings_pkey;
ALTER TABLE ONLY public._prisma_migrations DROP CONSTRAINT _prisma_migrations_pkey;
ALTER TABLE ONLY public."Transactions" DROP CONSTRAINT "Transactions_pkey";
ALTER TABLE ONLY public."Campaign" DROP CONSTRAINT "Campaign_pkey";
ALTER TABLE ONLY public."Admin" DROP CONSTRAINT "Admin_pkey";
ALTER TABLE public."Transactions" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."Admin" ALTER COLUMN id DROP DEFAULT;
DROP TABLE public.zakat_images;
DROP TABLE public.app_settings;
DROP TABLE public._prisma_migrations;
DROP SEQUENCE public."Transactions_id_seq";
DROP TABLE public."Transactions";
DROP TABLE public."Campaign";
DROP SEQUENCE public."Admin_id_seq";
DROP TABLE public."Admin";
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Admin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Admin" (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Admin" OWNER TO postgres;

--
-- Name: Admin_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Admin_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Admin_id_seq" OWNER TO postgres;

--
-- Name: Admin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Admin_id_seq" OWNED BY public."Admin".id;


--
-- Name: Campaign; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Campaign" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "imageUrl" text NOT NULL,
    collected integer NOT NULL,
    goal integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    category text NOT NULL,
    pillar text DEFAULT 'Kemanusiaan'::text NOT NULL
);


ALTER TABLE public."Campaign" OWNER TO postgres;

--
-- Name: Transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Transactions" (
    id integer NOT NULL,
    "flipTransactionId" text,
    status text NOT NULL,
    "senderName" text NOT NULL,
    "senderEmail" text,
    "senderPhone" text,
    amount integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    message text,
    "referenceId" text NOT NULL
);


ALTER TABLE public."Transactions" OWNER TO postgres;

--
-- Name: Transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Transactions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Transactions_id_seq" OWNER TO postgres;

--
-- Name: Transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Transactions_id_seq" OWNED BY public."Transactions".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    category text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- Name: zakat_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zakat_images (
    id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    "imageUrl" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.zakat_images OWNER TO postgres;

--
-- Name: Admin id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin" ALTER COLUMN id SET DEFAULT nextval('public."Admin_id_seq"'::regclass);


--
-- Name: Transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transactions" ALTER COLUMN id SET DEFAULT nextval('public."Transactions_id_seq"'::regclass);


--
-- Data for Name: Admin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Admin" (id, username, password, "createdAt") FROM stdin;
1	laznaswebane	$2b$10$EClyJfLfVbH93H4TZshEJONlkSJ2u4DiYaz2yAs8B48B4Skt/ip4e	2025-12-12 15:35:44.543
\.


--
-- Data for Name: Campaign; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Campaign" (id, title, description, "imageUrl", collected, goal, "createdAt", "updatedAt", category, pillar) FROM stdin;
1	Palestina Memanggil 	Jangan Biarkan Palestina Terdiam, Donasi Anda adalah suara mereka.	https://laznasdarunnajah.org/wp-content/uploads/2025/06/Web-1600px-x-888px-Palestina.png	0	500000000	2025-09-28 00:15:32.939	2025-12-12 15:35:44.308	donasi	Kemanusiaan
2	Wakaf Sumur untuk Daerah Kekeringan	Bantu pembangunan sumur wakaf untuk masyarakat di daerah kekeringan.	https://donasi.sahabatyatim.com/wp-content/uploads/2024/02/Donasi-Sahabat-Yatim-1.webp	0	300000000	2025-09-28 00:15:32.955	2025-12-12 15:35:44.33	wakaf	Kemanusiaan
3	Wakaf Sejuta Al-Qur'an	Bantu kebutuhan makan para santri penghafal Al-Qur'an di pelosok negeri.	https://laznasdarunnajah.org/wp-content/uploads/2025/06/Web-1600px-x-888px-Wakaf-Quran.png	0	150000000	2025-09-28 00:15:32.959	2025-12-12 15:35:44.34	sedekah	Pendidikan
f8e158ef-be33-4ed7-8448-dd989db08b6d	Yuk sejahterakan Masjid 	Program Hijrah Kebersihan Masjid merupakan inisiatif komunitas untuk meningkatkan kebersihan dan kenyamanan rumah ibadah melalui gotong royong. Program ini mengajak relawan, pemuda, dan jamaah masjid berkolaborasi membersihkan berbagai area masjid secara menyeluruh.\nProgram ini bertujuan menumbuhkan kesadaran akan pentingnya kebersihan dalam Islam, khususnya di masjid sebagai pusat ibadah. Selain menciptakan lingkungan higienis, kegiatan ini memperkuat ukhuwah Islamiyah dan syiar agama melalui pelayanan nyata kepada umat.\nMembersihkan area interior seperti karpet sajadah, kaca jendela, dan tempat shalat.\n\nMerawat fasilitas eksterior termasuk halaman, toilet, dan tempat wudhu.\n\nMendistribusikan paket alat kebersihan seperti sabun, disinfektan, serta perlengkapan shalat (sarung, mukena, sandal).\n\nKegiatan ini meningkatkan kenyamanan jamaah, terutama menjelang Ramadhan, serta mendukung marbot masjid dalam pemeliharaan rutin. Program serupa telah menjangkau ribuan masjid di Indonesia, menghadirkan keberkahan melalui kebersihan yang berkelanjutan.	https://laznas.histatne.biz.id/uploads/campaigns/a58e84ce-2f9f-4e76-8e1e-afd94dcb6472-Sembako marbot masjid.webp	0	150000000	2025-12-15 03:52:45.009	2025-12-15 03:52:45.009	donasi	Ekonomi
\.


--
-- Data for Name: Transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Transactions" (id, "flipTransactionId", status, "senderName", "senderEmail", "senderPhone", amount, "createdAt", "updatedAt", message, "referenceId") FROM stdin;
1	\N	PENDING	webane	webane@gmail.com	8123456786	10000	2025-12-09 17:39:56.715	2025-12-09 17:39:56.715	{"type":"donasi","campaignId":"2","campaign":"Wakaf Sumur untuk Daerah Kekeringan","message":""}	da807581-08bf-4538-a133-c6709e494052
2	\N	PENDING	webane	webane@gmail.com	08564233337	10000	2025-12-10 06:27:36.026	2025-12-10 06:27:36.026	{"type":"donasi","campaignId":"2","campaign":"Wakaf Sumur untuk Daerah Kekeringan","message":""}	e048858c-41a6-48ff-b441-5088406fe17a
3	\N	PENDING	webane	webane@gmail.com	08564233337	20000	2025-12-10 06:27:55.545	2025-12-10 06:27:55.545	{"type":"donasi","campaignId":"2","campaign":"Wakaf Sumur untuk Daerah Kekeringan","message":""}	3c6cd292-87e6-401c-b8e7-8996595f528d
4	\N	PENDING	rona	rona@gmail.com	08765432123	20000	2025-12-10 07:33:36.045	2025-12-10 07:33:36.045	{"type":"donasi","campaignId":"2","campaign":"Wakaf Sumur untuk Daerah Kekeringan","message":""}	9b120bc5-c8de-465a-a7d0-7c0cf369afa5
5	\N	PENDING	webane 	webane@gmail.com	08765767667	20000	2025-12-10 08:58:09.418	2025-12-10 08:58:09.418	{"type":"donasi","campaignId":"2","campaign":"Wakaf Sumur untuk Daerah Kekeringan","message":""}	25d8ce75-76f1-4db3-8678-8bedbf6137ee
6	\N	PENDING	Rinaldi Permana Putra	rinaldipermana26@gmail.com	082391162461	10000	2025-12-11 06:38:41.229	2025-12-11 06:38:41.229	{"type":"donasi","campaignId":"3","campaign":"Sedekah Makan Santri Penghafal Al-Qur'an","message":"bismillah"}	424389c4-96c9-4a04-8a39-10fd485f542f
7	\N	PENDING	Byron Castro	bryan@gmail.com	082120937688	500000	2025-12-11 15:44:49.841	2025-12-11 15:44:49.841	{"type":"donasi","campaignId":"3","campaign":"Sedekah Makan Santri Penghafal Al-Qur'an","message":""}	a0995cdb-ade4-4a98-9bed-76e9df44322c
8	\N	PENDING	Wasugi	wasugi@gmail.com	085210626455	50000	2025-12-15 06:03:33.669	2025-12-15 06:03:33.669	{"type":"donasi","campaignId":"f8e158ef-be33-4ed7-8448-dd989db08b6d","campaign":"Yuk sejahterakan Masjid ","message":"amin"}	5d1f4692-596c-4e42-84d3-6057f19e3070
9	\N	PENDING	Byron Castro	bryan@gmail.com	082120937688	500000	2025-12-27 11:59:33.33	2025-12-27 11:59:33.33	{"type":"donasi","campaignId":"f8e158ef-be33-4ed7-8448-dd989db08b6d","campaign":"Yuk sejahterakan Masjid ","message":""}	8922e5c6-37c5-404f-9f0c-4a92682578f5
10	\N	PENDING	Sri Mulyaningsih 	srimulyaningsih072@gmail.com	081374902450	200000	2026-01-05 06:23:56.122	2026-01-05 06:23:56.122	{"type":"donasi","campaignId":"3","campaign":"Wakaf Sejuta Al-Qur'an","message":"Semoga wakaf yang diberikan bermanfaat dan dapat menjadi penolong"}	4cc9bc77-ed25-411a-8ee0-c3c4c4a94883
11	\N	PENDING	Sri Mulyaningsih 	srimulyaningsih072@gmail.com	081374902450	200000	2026-01-05 06:25:17.552	2026-01-05 06:25:17.552	{"type":"donasi","campaignId":"3","campaign":"Wakaf Sejuta Al-Qur'an","message":"Semoga dapat bermanfaat dan dapat menjadi penolong di akhirat kelak, semoga penerima selalu dalam lindungan Allah SWT "}	e5816494-ebdf-4284-8250-f2e1e0808b51
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
746ae270-e60d-4260-a476-319d76d90377	c211c2af981f780a2787333e4bf930607e5c2503cd4fb1f3fb5904223bd3525b	2025-09-28 02:03:20.702637+02	20250906112457_rename_transactions_model	\N	\N	2025-09-28 02:03:20.69357+02	1
1d6379de-e999-4d3d-8b66-d22592d47487	aacd20dd8c46134b2a5193ad6ae3514356d954101655a1f301d79ed1aca203ab	2025-09-28 02:03:20.708704+02	20250908170859_add_campaign_model	\N	\N	2025-09-28 02:03:20.703394+02	1
24168958-08b9-4589-aa72-3bdabbf554b8	ba9e3d7b06c047468623882129eeaf252df3b7531c3279cc9d50fb0c84db5c7a	2025-09-28 02:15:17.061689+02	20250908232743_update_email_phone_to_optional	\N	\N	2025-09-28 02:15:17.055358+02	1
bf918c0a-6202-4610-8c07-edc77e56e566	aa7e27d5bde48b7c2ebe51dab3a035fef8da3d304c0694b34f0a02b045896def	2025-09-28 02:15:17.068028+02	20250909160540_add_category_to_campaign	\N	\N	2025-09-28 02:15:17.062819+02	1
802fc83e-e496-4cff-8f23-4eb4bbb77bfb	d50a8921cb6a6f484d267b96076ee0a6b2327e6aa2a56147782d9b5d8e9dbb37	2025-09-28 02:15:17.075828+02	20250923154351_add_message_and_refid_to_transactions	\N	\N	2025-09-28 02:15:17.069132+02	1
b907ba68-f14f-47f9-b849-94cb6f0bf682	186d23a44ab515001ebd01619a91eef0caec37057cf05a7964cc8b2a2c3cecc0	2025-10-19 08:51:29.513429+02	20251012132301_add_admin_model	\N	\N	2025-10-19 08:51:29.430975+02	1
15e80518-af83-41bc-aedc-bf126d52351a	65ad48d68a825abece35f66fb54f3aa3f918a4a533cb53db7d635ffe7b6a91d6	2025-10-31 11:06:48.143308+01	20251030080108_add_app_settings	\N	\N	2025-10-31 11:06:48.094914+01	1
c58cb280-0030-4966-8791-bff6e660af4c	f72fdb5c907b7660a8640122f7585e6c73f208cb50f64b0b07a75c1c0938821e	2025-11-09 13:19:35.926456+01	20251109103739_add_pillar_to_campaign	\N	\N	2025-11-09 13:19:35.907003+01	1
7d490b5b-ecc9-402f-830b-09733544f7c3	82804d1a224f2ff66f7858f0b1a3006bb4076a2c067be0ba3d80e8731e91d361	2025-12-12 16:35:41.828618+01	20251109134159_add_zakat_content	\N	\N	2025-12-12 16:35:41.778117+01	1
ebb6123a-59d0-40b6-bade-9113afc47330	88bd3e6cdb4aae1a77d8cefe51f2d2b236bbacb7a72c392f7381e5c79188a089	2025-12-12 16:35:41.855932+01	20251109142611_make_zakat_content_fields_optional	\N	\N	2025-12-12 16:35:41.839443+01	1
06ee32b1-fea7-4fcf-8734-987a8fcb4236	efae26173b8ef8ae2094c342ccd14684ed6068bffe3364e36e8aae606d84f149	2025-12-12 16:35:41.884255+01	20251117001218_add_zakat_images	\N	\N	2025-12-12 16:35:41.859471+01	1
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_settings (id, key, value, label, category, "createdAt", "updatedAt") FROM stdin;
5c07027f-d483-4b59-b8ba-a0ca3bf4de6a	harga_emas	1140000	Harga Emas per Gram (IDR)	emas	2025-10-31 10:07:32.194	2025-12-12 15:35:44.347
8167a03c-4501-4b99-9df6-ef16a069a943	zakat_fitrah_per_jiwa	45000	Zakat Fitrah per Jiwa (IDR)	zakat	2025-10-31 10:07:32.198	2025-12-12 15:35:44.365
8f5c4398-4b0c-44fb-b546-20accc2052a5	zakat_fidyah_per_hari	45000	Zakat Fidyah per Hari (IDR)	zakat	2025-10-31 10:07:32.199	2025-12-12 15:35:44.374
7ad34e59-4f7b-4607-9893-2774612ef8ba	nishab_emas_gram	85	Nishab Emas (Gram)	zakat	2025-10-31 10:07:32.201	2025-12-12 15:35:44.383
\.


--
-- Data for Name: zakat_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zakat_images (id, type, title, "imageUrl", "createdAt", "updatedAt") FROM stdin;
c577be8e-0a85-45c0-8bb0-a319b1ba1567	penghasilan	Zakat Penghasilan		2025-12-12 15:35:44.389	2025-12-12 15:35:44.389
3f5aeea4-a23b-4cda-99cd-f2933ef35127	maal	Zakat Maal		2025-12-12 15:35:44.398	2025-12-12 15:35:44.398
0a262bd7-9d93-4ed7-b99a-a40392515feb	emas	Zakat Emas		2025-12-12 15:35:44.403	2025-12-12 15:35:44.403
6a332393-8c59-4e6e-8c37-2e08f3d3a2dc	fitrah	Zakat Fitrah		2025-12-12 15:35:44.408	2025-12-12 15:35:44.408
0fff8599-4c0f-4f5b-b377-26723818aa13	fidyah	Zakat Fidyah	https://laznas.histatne.biz.id/uploads/campaigns/7c5006fa-b0e7-48fb-8e2f-6afec155ebe1-Campaign Website depan.webp	2025-12-12 15:35:44.414	2026-01-06 08:17:38.624
\.


--
-- Name: Admin_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Admin_id_seq"', 1, true);


--
-- Name: Transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Transactions_id_seq"', 11, true);


--
-- Name: Admin Admin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "Admin_pkey" PRIMARY KEY (id);


--
-- Name: Campaign Campaign_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Campaign"
    ADD CONSTRAINT "Campaign_pkey" PRIMARY KEY (id);


--
-- Name: Transactions Transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Transactions"
    ADD CONSTRAINT "Transactions_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: zakat_images zakat_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zakat_images
    ADD CONSTRAINT zakat_images_pkey PRIMARY KEY (id);


--
-- Name: Admin_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Admin_username_key" ON public."Admin" USING btree (username);


--
-- Name: Transactions_flipTransactionId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Transactions_flipTransactionId_key" ON public."Transactions" USING btree ("flipTransactionId");


--
-- Name: Transactions_referenceId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Transactions_referenceId_key" ON public."Transactions" USING btree ("referenceId");


--
-- Name: app_settings_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX app_settings_key_key ON public.app_settings USING btree (key);


--
-- Name: zakat_images_type_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX zakat_images_type_key ON public.zakat_images USING btree (type);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO postgres;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;


--
-- PostgreSQL database dump complete
--

\unrestrict eLEIjR4jRqcjExW0dvZz6pDC4BKKUu67NYacn6CiKYWDkLBckoCjQeL7JYDYMS5

