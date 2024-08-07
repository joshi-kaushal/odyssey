import Link from "next/link";
import { Button } from "../ui/button";

export default function Navbar() {
  return (
    <nav className="p-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <h2 className="font-serif text-xl tracking-wider">Odyssey</h2>
      </div>

      <div className="hidden lg:flex flex-nowrap gap-4 items-center">
        <Link href="/blog">Blog</Link>
        <Link href="/books">Books</Link>
        <Link href="/memories">Memories</Link>
        <Link href="/tasks">Tasks</Link>
        <Link href="/login">Login</Link>
      </div>
    </nav>
  );
}
