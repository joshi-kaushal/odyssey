export interface ManagePageProps {
    params: { edit: string };
    searchParams?: { [key: string]: string | string[] | undefined };
}

export
    interface SlugPageProps {
    params: { slug: string };
}
