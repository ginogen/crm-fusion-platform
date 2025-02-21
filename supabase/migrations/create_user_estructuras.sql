create table if not exists user_estructuras (
  user_id uuid references auth.users(id) on delete cascade,
  estructura_id int references estructuras(id) on delete cascade,
  primary key (user_id, estructura_id)
); 