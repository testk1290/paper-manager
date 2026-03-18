-- Create custom Tables
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.tags (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.documents (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    note TEXT,
    image_paths TEXT[],
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    expires_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.document_tags (
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies
CREATE POLICY "Users can view own categories." 
ON public.categories FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own categories." 
ON public.categories FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own categories." 
ON public.categories FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own categories." 
ON public.categories FOR DELETE USING ((select auth.uid()) = user_id);


CREATE POLICY "Users can view own tags." 
ON public.tags FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own tags." 
ON public.tags FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own tags." 
ON public.tags FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own tags." 
ON public.tags FOR DELETE USING ((select auth.uid()) = user_id);


CREATE POLICY "Users can view own documents." 
ON public.documents FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own documents." 
ON public.documents FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own documents." 
ON public.documents FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own documents." 
ON public.documents FOR DELETE USING ((select auth.uid()) = user_id);


-- Since document_tags doesn't have a user_id, we need to join it with the document's user_id
CREATE POLICY "Users can view document tags." 
ON public.document_tags FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.documents WHERE documents.id = document_tags.document_id AND documents.user_id = (select auth.uid())
  )
);

CREATE POLICY "Users can manage document tags." 
ON public.document_tags FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.documents WHERE documents.id = document_tags.document_id AND documents.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents WHERE documents.id = document_tags.document_id AND documents.user_id = (select auth.uid())
  )
);

-- Trigger for documents updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime schema extensions;

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.documents 
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);


-- Create Storage Bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('document-images', 'document-images', false);

-- Set up Storage RLS
CREATE POLICY "Users can view own images." 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'document-images' AND auth.uid()::text = (string_to_array(name, '/'))[1] );

CREATE POLICY "Users can upload own images." 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'document-images' AND auth.uid()::text = (string_to_array(name, '/'))[1] );

CREATE POLICY "Users can update own images." 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'document-images' AND auth.uid()::text = (string_to_array(name, '/'))[1] );

CREATE POLICY "Users can delete own images." 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'document-images' AND auth.uid()::text = (string_to_array(name, '/'))[1] );
