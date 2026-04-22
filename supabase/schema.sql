-- Create a table for public profiles using the auth.users table
create table profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Variable for the admin email to be used in the seed
do $$
begin
  -- This is a placeholder. Seeding admin usually requires insertion into auth.users which is restricted.
  -- The user should sign up manually or use the Supabase dashboard to create the user.
end $$;

-- Policies for profiles
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for processes
create table processes (
  id uuid default uuid_generate_v4() primary key,
  title varchar(30) not null,
  description varchar(160) not null,
  nup varchar(50),
  contract_number varchar(50),
  object_nature varchar(100),
  status varchar(20) default 'rascunho',
  user_id uuid references profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Policies for processes
alter table processes enable row level security;

-- Admin can view all processes. User can view only their own.
create policy "Processes are viewable by own user or admin." on processes
  for select using (
    auth.uid() = user_id or 
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Admin can insert processes (users too, restricted by app logic but safe in DB)
-- Actually, users should be able to create processes.
create policy "Users can create processes." on processes
  for insert with check (auth.uid() = user_id);

-- Admin can update all processes. User can update only their own.
create policy "Processes are updatable by own user or admin." on processes
  for update using (
    auth.uid() = user_id or 
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Admin can delete all processes. User can delete only their own.
create policy "Processes are deletable by own user or admin." on processes
  for delete using (
    auth.uid() = user_id or 
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a table for documents (DFD, TR, etc)
create table documents (
  id uuid default uuid_generate_v4() primary key,
  process_id uuid references processes(id) on delete cascade not null,
  type varchar(50) not null,
  title varchar(100) not null,
  demand_text text,
  generated_text text,
  estimated_value numeric(15,2),
  status varchar(20) default 'draft',
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Policies for documents
alter table documents enable row level security;

create policy "Documents are viewable by process owner or admin." on documents
  for select using (
    exists (
      select 1 from processes 
      where processes.id = documents.process_id 
      and (processes.user_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
    )
  );

create policy "Documents are insertable by process owner or admin." on documents
  for insert with check (
    exists (
      select 1 from processes 
      where processes.id = documents.process_id 
      and (processes.user_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
    )
  );

create policy "Documents are updatable by process owner or admin." on documents
  for update using (
    exists (
      select 1 from processes 
      where processes.id = documents.process_id 
      and (processes.user_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
    )
  );

create policy "Documents are deletable by process owner or admin." on documents
  for delete using (
    exists (
      select 1 from processes 
      where processes.id = documents.process_id 
      and (processes.user_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
    )
  );
