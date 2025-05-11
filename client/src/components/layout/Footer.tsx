const Footer = () => {
  return (
    <footer className="py-4 px-6 border-t border-neutral-200 bg-white">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <p className="text-sm text-neutral-500">© {new Date().getFullYear()} WealthWise. All rights reserved.</p>
        <div className="flex space-x-4 mt-2 md:mt-0">
          <a href="#" className="text-sm text-neutral-500 hover:text-primary">Privacy Policy</a>
          <a href="#" className="text-sm text-neutral-500 hover:text-primary">Terms of Service</a>
          <a href="#" className="text-sm text-neutral-500 hover:text-primary">Contact Us</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
