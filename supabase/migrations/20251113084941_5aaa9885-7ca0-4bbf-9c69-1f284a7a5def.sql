-- Add RLS policies for admins to manage avatars
CREATE POLICY "Admins can update avatars"
ON public.avatars
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert avatars"
ON public.avatars
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete avatars"
ON public.avatars
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));